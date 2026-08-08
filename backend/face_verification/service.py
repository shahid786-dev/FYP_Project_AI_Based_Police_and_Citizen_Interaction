"""
face_verification/service.py
=============================
FaceVerificationService — Core business logic layer.

This class orchestrates the full verification pipeline:

    1. Load/warm embedding store (in-memory)
    2. Extract embedding from live webcam image
    3. Run cosine similarity search against NADRA embeddings
    4. Evaluate against threshold
    5. Save FaceVerificationReport to DB
    6. Log verification attempt to FaceVerificationLog
    7. Append blockchain block (audit trail)
    8. Return structured VerificationResult

Clean architecture: views call this service, never touching models directly.
"""

import logging
import time
from typing import Optional

from django.db import DatabaseError as DjangoDatabaseError

from .exceptions import (
    FaceVerificationError,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    CorruptedImageError,
    PoorImageQualityError,
    LowConfidenceMatchError,
    EmbeddingStoreError,
    DatabaseError,
)
from .embedding_store import EmbeddingStore
from .face_processor import extract_embedding_from_bytes, get_model_name
from .models import FaceVerificationReport, FaceVerificationLog

logger = logging.getLogger('face_verification')

# ── Verification threshold ──────────────────────────────────────────────────
SIMILARITY_THRESHOLD = 0.70   # Cosine similarity (70%)
HIGH_CONFIDENCE_THRESHOLD = 0.90


def _determine_confidence_level(similarity_pct: float) -> str:
    """Map similarity percentage to confidence label."""
    if similarity_pct >= 90:
        return 'HIGH'
    if similarity_pct >= 70:
        return 'MEDIUM'
    if similarity_pct > 0:
        return 'LOW'
    return 'NONE'


def _append_blockchain_block(report: FaceVerificationReport, citizen) -> None:
    """
    Append an immutable blockchain block for this verification event.
    Non-fatal — if blockchain write fails, we log but don't raise.
    """
    try:
        from blockchain.service import BlockchainService

        payload = {
            'report_id':         str(report.report_id),
            'status':            report.status,
            'similarity_pct':    report.similarity_pct,
            'matched_cnic':      report.matched_cnic or 'NONE',
            'matched_name':      report.matched_citizen_name or 'NONE',
            'model_used':        report.model_used,
            'threshold':         report.threshold_used,
            'verified_at':       str(report.verified_at),
        }

        block = BlockchainService.add_block(
            action_type='AI_FACE_VERIFY',
            record_id=str(report.report_id),
            performed_by=str(citizen.cnic) if citizen else 'SYSTEM',
            payload=payload,
        )

        # Link blockchain reference back to report
        report.blockchain_block_index = block.block_index
        report.blockchain_hash = block.current_hash
        report.save(update_fields=['blockchain_block_index', 'blockchain_hash'])

        logger.info(
            'Blockchain block #%d appended for report %s',
            block.block_index, report.report_id
        )

    except Exception as exc:
        logger.warning('Blockchain write failed for report %s: %s', report.report_id, exc)


# ═══════════════════════════════════════════════════════════════════════════ #
# Public Service Class
# ═══════════════════════════════════════════════════════════════════════════ #

class FaceVerificationService:
    """
    Orchestrates end-to-end face verification.

    All public methods are class methods — no instance state needed.
    """

    # ── Entry point ─────────────────────────────────────────────────────

    @classmethod
    def verify(
        cls,
        image_bytes: bytes,
        citizen,
        application=None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> FaceVerificationReport:
        """
        Main entry point: verify a live face image against NADRA embeddings.

        Parameters
        ----------
        image_bytes   : raw bytes of the captured webcam frame (JPEG/PNG).
        citizen       : User model instance (must be authenticated).
        application   : Application model instance (optional linkage).
        ip_address    : Request IP for audit logging.
        user_agent    : User agent string for audit logging.

        Returns
        -------
        FaceVerificationReport instance (already saved to DB).

        Raises
        ------
        Never raises — all errors are captured into the returned report.
        Use report.status and report.error_code to inspect results.
        """
        start_time = time.perf_counter()
        report = None
        model_name = get_model_name()

        try:
            # ── Step 1: Get embedding store ──────────────────────────────
            store = EmbeddingStore.get_instance()
            if not store.is_ready:
                raise EmbeddingStoreError(
                    'NADRA face embeddings not found. '
                    'Please run: python manage.py generate_nadra_embeddings'
                )

            logger.info(
                'Starting face verification for citizen=%s (store=%d records)',
                getattr(citizen, 'cnic', 'UNKNOWN'), store.total_records
            )

            # ── Step 2: Extract live face embedding ──────────────────────
            live_embedding, embed_meta = extract_embedding_from_bytes(
                image_bytes, check_quality=True
            )
            model_name = embed_meta.get('model_used', model_name)
            embedding_dim = embed_meta.get('embedding_dim', 512)

            # ── Step 3: Search against NADRA embeddings ──────────────────
            matches = store.find_best_match(
                query_embedding=live_embedding,
                top_k=1,
                threshold=SIMILARITY_THRESHOLD,
            )

            # ── Step 4: Evaluate match quality ───────────────────────────
            elapsed_ms = (time.perf_counter() - start_time) * 1000

            if not matches:
                # No match above threshold → verification failed
                report = cls._create_report(
                    citizen=citizen,
                    application=application,
                    status='FAILED',
                    similarity_score=0.0,
                    similarity_pct=0.0,
                    model_used=model_name,
                    embedding_dim=embedding_dim,
                    processing_time_ms=elapsed_ms,
                    threshold_used=SIMILARITY_THRESHOLD,
                )
                logger.warning(
                    'Verification FAILED for citizen=%s — no match above threshold=%.2f',
                    getattr(citizen, 'cnic', '?'), SIMILARITY_THRESHOLD
                )
            else:
                best = matches[0]
                sim_score = best['similarity']
                sim_pct   = best['similarity_pct']
                status    = 'VERIFIED'
                confidence_level = _determine_confidence_level(sim_pct)

                report = cls._create_report(
                    citizen=citizen,
                    application=application,
                    status=status,
                    matched_cnic=best['cnic'],
                    matched_citizen_name=best['full_name'],
                    matched_father_name=best['father_name'],
                    similarity_score=sim_score,
                    similarity_pct=sim_pct,
                    confidence_level=confidence_level,
                    model_used=model_name,
                    embedding_dim=embedding_dim,
                    processing_time_ms=elapsed_ms,
                    threshold_used=SIMILARITY_THRESHOLD,
                )
                logger.info(
                    'Verification %s — citizen=%s matched CNIC=%s sim=%.2f%%',
                    status,
                    getattr(citizen, 'cnic', '?'),
                    best['cnic'],
                    sim_pct,
                )

        # ── Error handling: each exception → specific status ─────────────
        except NoFaceDetectedError as exc:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            report = cls._create_error_report(
                citizen, application, 'NO_FACE', exc, model_name, elapsed_ms
            )
        except MultipleFacesDetectedError as exc:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            report = cls._create_error_report(
                citizen, application, 'MULTIPLE_FACES', exc, model_name, elapsed_ms
            )
        except (CorruptedImageError, PoorImageQualityError) as exc:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            report = cls._create_error_report(
                citizen, application, 'LOW_QUALITY', exc, model_name, elapsed_ms
            )
        except EmbeddingStoreError as exc:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            report = cls._create_error_report(
                citizen, application, 'STORE_NOT_READY', exc, model_name, elapsed_ms
            )
        except (DjangoDatabaseError, DatabaseError) as exc:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.exception('Database error during face verification: %s', exc)
            report = cls._create_error_report(
                citizen, application, 'DB_ERROR', exc, model_name, elapsed_ms
            )
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.exception('Unexpected error during face verification: %s', exc)
            report = cls._create_error_report(
                citizen, application, 'EMBEDDING_ERROR', exc, model_name, elapsed_ms
            )

        # ── Step 5: Log the attempt ───────────────────────────────────────
        cls._log_attempt(report, citizen, ip_address, user_agent)

        # ── Step 6: Blockchain audit ──────────────────────────────────────
        if report:
            _append_blockchain_block(report, citizen)

        return report

    # ── Internal helpers ────────────────────────────────────────────────

    @staticmethod
    def _create_report(
        citizen,
        application,
        status: str,
        model_used: str,
        embedding_dim: int,
        processing_time_ms: float,
        threshold_used: float,
        similarity_score: float = 0.0,
        similarity_pct: float = 0.0,
        confidence_level: str = 'NONE',
        matched_cnic: str = None,
        matched_citizen_name: str = None,
        matched_father_name: str = None,
    ) -> FaceVerificationReport:
        """Create and save a FaceVerificationReport."""
        report = FaceVerificationReport.objects.create(
            citizen=citizen,
            application=application,
            status=status,
            matched_cnic=matched_cnic,
            matched_citizen_name=matched_citizen_name,
            matched_father_name=matched_father_name,
            similarity_score=similarity_score,
            similarity_pct=similarity_pct,
            confidence_level=confidence_level,
            model_used=model_used,
            embedding_dim=embedding_dim,
            processing_time_ms=processing_time_ms,
            threshold_used=threshold_used,
        )
        return report

    @staticmethod
    def _create_error_report(
        citizen,
        application,
        status: str,
        exc: Exception,
        model_used: str,
        processing_time_ms: float,
    ) -> FaceVerificationReport:
        """Create and save an error-state FaceVerificationReport."""
        error_code = getattr(exc, 'error_code', 'UNKNOWN_ERROR')
        error_message = str(exc)

        report = FaceVerificationReport.objects.create(
            citizen=citizen,
            application=application,
            status=status,
            model_used=model_used,
            processing_time_ms=processing_time_ms,
            error_code=error_code,
            error_message=error_message,
            threshold_used=SIMILARITY_THRESHOLD,
        )
        logger.error(
            'Face verification error [%s]: %s (citizen=%s)',
            status, error_message, getattr(citizen, 'cnic', '?')
        )
        return report

    @staticmethod
    def _log_attempt(
        report: Optional[FaceVerificationReport],
        citizen,
        ip_address: Optional[str],
        user_agent: Optional[str],
    ):
        """Append a FaceVerificationLog record."""
        try:
            FaceVerificationLog.objects.create(
                report=report,
                ip_address=ip_address,
                user_agent=user_agent,
                citizen_cnic=getattr(citizen, 'cnic', None),
            )
        except Exception as exc:
            logger.warning('Failed to create verification log: %s', exc)

    # ── Read helpers ────────────────────────────────────────────────────

    @staticmethod
    def get_citizen_history(citizen, limit: int = 10):
        """Return the N most recent verification reports for a citizen."""
        return (
            FaceVerificationReport.objects
            .filter(citizen=citizen)
            .order_by('-verified_at')[:limit]
        )

    @staticmethod
    def get_report_by_id(report_id: str, citizen) -> FaceVerificationReport:
        """Retrieve a single report by UUID, scoped to the requesting citizen."""
        return FaceVerificationReport.objects.get(
            report_id=report_id,
            citizen=citizen,
        )

    @staticmethod
    def get_store_status() -> dict:
        """Return embedding store health info."""
        try:
            store = EmbeddingStore.get_instance()
            return {
                'ready': store.is_ready,
                'total_records': store.total_records,
                'model': get_model_name(),
            }
        except Exception as exc:
            return {'ready': False, 'error': str(exc)}
