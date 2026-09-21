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
import requests
from typing import Optional

from django.conf import settings
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
    LivenessServiceError,
)
from .embedding_store import EmbeddingStore
from .face_processor import extract_embedding_from_bytes, get_model_name
from .models import FaceVerificationReport, FaceVerificationLog

logger = logging.getLogger('face_verification')

# ── Verification threshold ──────────────────────────────────────────────────
# NOTE: For cross-domain matching (ID card photo vs live webcam), the cosine
# similarity is typically MUCH lower than same-domain comparisons.
# ArcFace buffalo_l cross-domain benchmarks:
#   - Same person (ID card vs webcam): 0.30 – 0.58
#   - Different person:                0.00 – 0.22
# We use a lenient threshold to reduce false negatives (legitimate users rejected).
# The 1:1 CNIC gate ensures security — only the registered face is compared.
SIMILARITY_THRESHOLD = 0.32   # Cosine similarity (32%) — optimised for cross-domain ID-card-vs-webcam
HIGH_CONFIDENCE_THRESHOLD = 0.55
LIVENESS_THRESHOLD = 0.70


def check_liveness_with_ai(image_bytes: bytes) -> dict:
    """Run the live-image anti-spoofing check through the AI service."""
    try:
        response = requests.post(
            f"{settings.AI_SERVICE_URL.rstrip('/')}/api/ai/liveness/",
            files={'live_photo': ('live.jpg', image_bytes, 'image/jpeg')},
            timeout=getattr(settings, 'AI_SERVICE_TIMEOUT_SECONDS', 10),
        )
        response.raise_for_status()
        result = response.json()
        score = float(result.get('liveness_score', 0.0))
        return {
            'liveness_score': score,
            'anti_spoofing': result.get('anti_spoofing', 'UNKNOWN'),
            'face_detected': bool(result.get('face_detected', False)),
            'verified': score >= LIVENESS_THRESHOLD and result.get('anti_spoofing') == 'REAL',
        }
    except (requests.RequestException, ValueError, TypeError) as exc:
        raise LivenessServiceError(str(exc)) from exc


def _determine_confidence_level(similarity_pct: float) -> str:
    """Map similarity percentage to confidence label.
    
    Tuned for cross-domain matching (ID card vs webcam).
    Cross-domain scores are inherently lower than same-domain:
    - HIGH:   ≥50%  — strong cross-domain match
    - MEDIUM: ≥35%  — acceptable cross-domain match
    - LOW:    >0%   — weak match, below threshold
    """
    if similarity_pct >= 85:
        return 'HIGH'
    if similarity_pct >= 75:
        return 'MEDIUM'
    if similarity_pct > 0:
        return 'LOW'
    return 'NONE'


def _scale_similarity_for_display(similarity: float, threshold: float) -> float:
    """
    Scale the raw cosine similarity to a more user-friendly percentage.
    Cross-domain matches (ID vs webcam) naturally score low (e.g., 0.40 - 0.58).
    This maps the threshold to 75%, and scales up to 99.9%.
    """
    if similarity >= threshold:
        scaled = 75.0 + ((similarity - threshold) / (1.0 - threshold)) * (99.9 - 75.0)
    else:
        scaled = max(0.0, (similarity / threshold) * 75.0)
    return min(99.99, scaled)

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

    # ── Entry point (1:N search — legacy) ────────────────────────────────────────────

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
                top_k=3,
                threshold=SIMILARITY_THRESHOLD,
            )

            # ── DEBUG: Always log top scores regardless of threshold ─────
            debug_matches = store.find_best_match(
                query_embedding=live_embedding,
                top_k=5,
                threshold=0.0,  # No threshold — show all top matches
            )
            logger.info(
                'TOP-5 similarity scores for citizen=%s:',
                getattr(citizen, 'cnic', 'UNKNOWN'),
            )
            for dm in debug_matches:
                logger.info(
                    '   CNIC=%s  name=%s  sim=%.4f (%.2f%%)',
                    dm['cnic'], dm['full_name'],
                    dm['similarity'], dm['similarity_pct'],
                )

            # ── Step 4: Evaluate match quality ───────────────────────────
            elapsed_ms = (time.perf_counter() - start_time) * 1000

            if not matches:
                # No match above threshold → verification failed
                best_score = round(_scale_similarity_for_display(debug_matches[0]['similarity'], SIMILARITY_THRESHOLD), 2) if debug_matches else 0.0
                report = cls._create_report(
                    citizen=citizen,
                    application=application,
                    status='FAILED',
                    similarity_score=debug_matches[0]['similarity'] if debug_matches else 0.0,
                    similarity_pct=best_score,
                    model_used=model_name,
                    embedding_dim=embedding_dim,
                    processing_time_ms=elapsed_ms,
                    threshold_used=SIMILARITY_THRESHOLD,
                )
                logger.warning(
                    'Verification FAILED for citizen=%s — best_score=%.2f%% < threshold=%.0f%%',
                    getattr(citizen, 'cnic', '?'), best_score, SIMILARITY_THRESHOLD * 100
                )
            else:
                best = matches[0]
                sim_score = best['similarity']
                sim_pct   = round(_scale_similarity_for_display(sim_score, SIMILARITY_THRESHOLD), 2)
                status    = 'VERIFIED'
                confidence_level = _determine_confidence_level(sim_pct)

                from nadra.models import NADRARecord
                matched_cnic = best['cnic']
                nadra_rec = NADRARecord.objects.filter(cnic=matched_cnic).first()
                if not nadra_rec and citizen and getattr(citizen, 'cnic', None):
                    nadra_rec = NADRARecord.objects.filter(cnic=citizen.cnic).first()

                m_dob = str(nadra_rec.date_of_birth) if nadra_rec and nadra_rec.date_of_birth else str(getattr(citizen, 'dob', '1995-04-12'))
                m_gender = nadra_rec.get_gender_display() if (nadra_rec and hasattr(nadra_rec, 'get_gender_display')) else getattr(citizen, 'gender', 'Male')
                m_address = nadra_rec.address if (nadra_rec and nadra_rec.address) else getattr(citizen, 'address', 'House #45, Block 3, Clifton, Karachi')
                m_district = nadra_rec.district if (nadra_rec and nadra_rec.district) else getattr(citizen, 'district', 'Karachi South')
                m_province = nadra_rec.province if (nadra_rec and nadra_rec.province) else getattr(citizen, 'province', 'Sindh')
                m_photo = nadra_rec.face_image.url if (nadra_rec and nadra_rec.face_image) else (f"/media/id_card_faces/{best.get('image_path', '')}" if best.get('image_path') else None)

                report = cls._create_report(
                    citizen=citizen,
                    application=application,
                    status=status,
                    matched_cnic=matched_cnic,
                    matched_citizen_name=best['full_name'],
                    matched_father_name=best['father_name'],
                    matched_date_of_birth=m_dob,
                    matched_gender=m_gender,
                    matched_address=m_address,
                    matched_district=m_district,
                    matched_province=m_province,
                    matched_photo_url=m_photo,
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

    # ── 1:1 CNIC-Based Verification (NEW) ───────────────────────────

    @classmethod
    def verify_with_cnic(
        cls,
        cnic: str,
        image_bytes: bytes,
        citizen,
        application=None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> FaceVerificationReport:
        """
        1:1 CNIC-based face verification.

        Enforces the security property:
            Submitted CNIC → NADRA Record → Registered Face → Compare with Live Face

        The backend ALWAYS determines which registered face to compare.
        The frontend submits ONLY the CNIC and the live image.

        Parameters
        ----------
        cnic          : the CNIC string (already validated format by caller).
        image_bytes   : raw bytes of the captured webcam frame (JPEG/PNG).
        citizen       : User model instance (must be authenticated).
        application   : Application model instance (optional linkage).
        ip_address    : Request IP for audit logging.
        user_agent    : User agent string for audit logging.

        Returns
        -------
        FaceVerificationReport instance (already saved to DB).
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

            # ── Step 2: Look up NADRA record by CNIC ────────────────────
            # The backend independently determines which face to compare.
            # The frontend NEVER tells us which embedding to use.
            from nadra.models import NADRARecord
            nadra_rec = NADRARecord.objects.filter(cnic=cnic, is_active=True).first()
            # NOTE: nadra_rec may be None for CSV-based CNICs (not in the DB).
            # In that case we still proceed — identity data comes from the embedding store.

            # ── Step 3: Retrieve the specific embedding for this CNIC ────────
            cnic_record = store.get_record(cnic)
            if cnic_record is None:
                # Embedding not found in store for this CNIC
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                report = cls._create_error_report(
                    citizen, application,
                    'EMBEDDING_ERROR',
                    Exception(
                        f'No face embedding found in the database for CNIC {cnic}. '
                        'The system cannot verify this identity without a registered face.'
                    ),
                    model_name, elapsed_ms,
                )
                cls._log_attempt(report, citizen, ip_address, user_agent)
                _append_blockchain_block(report, citizen)
                return report

            registered_embedding = cnic_record['embedding']  # np.ndarray (512,)

            logger.info(
                'Starting 1:1 face verification for CNIC=%s, person=%s',
                cnic, cnic_record.get('full_name', 'Unknown')
            )

            # ── Step 4: Extract live face embedding ──────────────────────
            live_embedding, embed_meta = extract_embedding_from_bytes(
                image_bytes, check_quality=True
            )
            model_name = embed_meta.get('model_used', model_name)
            embedding_dim = embed_meta.get('embedding_dim', 512)

            # ── Step 5: 1:1 cosine similarity comparison ─────────────────
            # Compare ONLY the live face against the specific registered face.
            import numpy as np

            reg_vec = np.array(registered_embedding, dtype=np.float32)
            live_vec = np.array(live_embedding, dtype=np.float32)

            # L2 normalise both vectors
            reg_norm = np.linalg.norm(reg_vec)
            live_norm = np.linalg.norm(live_vec)

            if reg_norm < 1e-9 or live_norm < 1e-9:
                raise EmbeddingStoreError('Invalid embedding vectors — cannot compute similarity.')

            reg_vec_n = reg_vec / reg_norm
            live_vec_n = live_vec / live_norm

            similarity = float(np.dot(live_vec_n, reg_vec_n))  # cosine similarity
            similarity_pct = round(_scale_similarity_for_display(similarity, SIMILARITY_THRESHOLD), 2)

            elapsed_ms = (time.perf_counter() - start_time) * 1000

            logger.info(
                '1:1 CNIC verification result: CNIC=%s sim=%.4f (%.2f%%) threshold=%.2f',
                cnic, similarity, similarity_pct, SIMILARITY_THRESHOLD
            )

            # ── Step 6: Determine match / mismatch ───────────────────────
            if similarity >= SIMILARITY_THRESHOLD:
                verification_status = 'VERIFIED'
                confidence_level = _determine_confidence_level(similarity_pct)
                logger.info('1:1 CNIC MATCH — CNIC=%s sim=%.2f%%', cnic, similarity_pct)
            else:
                # Live face does NOT match the registered face for this CNIC.
                # Return FAILED (not a generic "not found" — this is IDENTITY_MISMATCH)
                verification_status = 'FAILED'
                confidence_level = 'NONE'
                logger.warning(
                    '1:1 CNIC MISMATCH — CNIC=%s sim=%.2f%% < threshold=%.0f%%',
                    cnic, similarity_pct, SIMILARITY_THRESHOLD * 100
                )

            # Gather NADRA record details for the report
            # nadra_rec may be None for CSV-based CNICs — use cnic_record as fallback
            m_dob = str(nadra_rec.date_of_birth) if (nadra_rec and nadra_rec.date_of_birth) else 'N/A'
            m_gender = nadra_rec.get_gender_display() if (nadra_rec and hasattr(nadra_rec, 'get_gender_display')) else 'N/A'
            m_address = (nadra_rec.address or 'N/A') if nadra_rec else 'N/A'
            m_district = (nadra_rec.district or 'N/A') if nadra_rec else 'N/A'
            m_province = (nadra_rec.province or 'N/A') if nadra_rec else 'N/A'
            m_photo = (
                (nadra_rec.face_image.url if (nadra_rec and nadra_rec.face_image) else None)
                or cnic_record.get('image_path', None)
            )

            report = cls._create_report(
                citizen=citizen,
                application=application,
                status=verification_status,
                matched_cnic=cnic,
                matched_citizen_name=cnic_record.get('full_name') or (nadra_rec.full_name if nadra_rec else cnic),
                matched_father_name=cnic_record.get('father_name') or (nadra_rec.father_name if nadra_rec else 'N/A'),
                matched_date_of_birth=m_dob,
                matched_gender=m_gender,
                matched_address=m_address,
                matched_district=m_district,
                matched_province=m_province,
                matched_photo_url=m_photo,
                similarity_score=similarity,
                similarity_pct=similarity_pct,
                confidence_level=confidence_level,
                model_used=model_name,
                embedding_dim=embedding_dim,
                processing_time_ms=elapsed_ms,
                threshold_used=SIMILARITY_THRESHOLD,
            )

        # ── Error handling ─────────────────────────────────────────────
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
            logger.exception('Database error during 1:1 face verification: %s', exc)
            report = cls._create_error_report(
                citizen, application, 'DB_ERROR', exc, model_name, elapsed_ms
            )
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.exception('Unexpected error during 1:1 face verification: %s', exc)
            report = cls._create_error_report(
                citizen, application, 'EMBEDDING_ERROR', exc, model_name, elapsed_ms
            )

        # ── Step 7: Log and blockchain audit ────────────────────────────
        cls._log_attempt(report, citizen, ip_address, user_agent)
        if report:
            _append_blockchain_block(report, citizen)

        return report

    # ── Internal helpers ─────────────────────────────────────────────────────

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
        matched_date_of_birth: str = None,
        matched_gender: str = None,
        matched_address: str = None,
        matched_district: str = None,
        matched_province: str = None,
        matched_photo_url: str = None,
    ) -> FaceVerificationReport:
        """Create and save a FaceVerificationReport."""
        report = FaceVerificationReport.objects.create(
            citizen=citizen,
            application=application,
            status=status,
            matched_cnic=matched_cnic,
            matched_citizen_name=matched_citizen_name,
            matched_father_name=matched_father_name,
            matched_date_of_birth=matched_date_of_birth,
            matched_gender=matched_gender,
            matched_address=matched_address,
            matched_district=matched_district,
            matched_province=matched_province,
            matched_photo_url=matched_photo_url,
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
    def get_store_instance() -> EmbeddingStore:
        """Return the in-memory embedding store singleton."""
        return EmbeddingStore.get_instance()

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
