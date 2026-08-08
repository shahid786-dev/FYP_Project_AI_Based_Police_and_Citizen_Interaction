"""
face_verification/models.py
============================
Database models for the AI Face Verification module.

Models
------
FaceVerificationReport  — Persists every verification attempt with full details.
FaceVerificationLog     — Lightweight audit trail for every API hit.
"""

import uuid
from django.db import models
from django.conf import settings


class FaceVerificationReport(models.Model):
    """
    Stores the complete result of a live-face-vs-NADRA-database verification.
    One record per verification attempt.

    Used for:
    - Displaying results to the citizen
    - Admin reporting and audit
    - Blockchain event payload
    """

    STATUS_CHOICES = (
        ('VERIFIED',            'Verified ✓'),
        ('FAILED',              'Verification Failed ✗'),
        ('NO_FACE',             'No Face Detected'),
        ('MULTIPLE_FACES',      'Multiple Faces Detected'),
        ('LOW_QUALITY',         'Image Quality Too Low'),
        ('EMBEDDING_ERROR',     'Embedding Generation Error'),
        ('DB_ERROR',            'Database Error'),
        ('STORE_NOT_READY',     'Embedding Store Not Ready'),
    )

    CONFIDENCE_LEVELS = (
        ('HIGH',    'High (≥90%)'),
        ('MEDIUM',  'Medium (70–89%)'),
        ('LOW',     'Low (<70%)'),
        ('NONE',    'No Match'),
    )

    # ── Unique identifier ────────────────────────────────────────────────
    report_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        help_text='Unique identifier for this verification report.',
    )

    # ── Citizen who triggered the verification ───────────────────────────
    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='face_verifications',
        help_text='The authenticated citizen who initiated verification.',
    )

    # ── Application (optional linkage) ────────────────────────────────────
    application = models.ForeignKey(
        'applications.Application',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='face_verifications',
        help_text='Police verification application this check relates to.',
    )

    # ── Matched NADRA record ─────────────────────────────────────────────
    # NOTE: we store these directly (not FK to NADRARecord)
    # because even a failed match should persist its best-effort data.
    matched_cnic        = models.CharField(max_length=15, blank=True, null=True)
    matched_citizen_name = models.CharField(max_length=100, blank=True, null=True)
    matched_father_name  = models.CharField(max_length=100, blank=True, null=True)

    # ── Similarity metrics ───────────────────────────────────────────────
    similarity_score    = models.FloatField(
        default=0.0,
        help_text='Cosine similarity score (0.0 – 1.0).',
    )
    similarity_pct      = models.FloatField(
        default=0.0,
        help_text='Similarity expressed as a percentage (0–100).',
    )

    # ── Outcome ───────────────────────────────────────────────────────────
    status              = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='FAILED',
        db_index=True,
    )
    confidence_level    = models.CharField(
        max_length=10,
        choices=CONFIDENCE_LEVELS,
        default='NONE',
    )
    threshold_used      = models.FloatField(
        default=0.70,
        help_text='Cosine similarity threshold used during this verification.',
    )

    # ── Technical metadata ───────────────────────────────────────────────
    model_used          = models.CharField(
        max_length=50,
        default='InsightFace-ArcFace',
        help_text='AI model used to generate embeddings.',
    )
    embedding_dim       = models.IntegerField(
        default=512,
        help_text='Dimensionality of the face embedding vector.',
    )
    processing_time_ms  = models.FloatField(
        default=0.0,
        help_text='Wall-clock time in milliseconds for the full verification pipeline.',
    )

    # ── Error info (for non-VERIFIED statuses) ────────────────────────────
    error_code          = models.CharField(max_length=50, blank=True, null=True)
    error_message       = models.TextField(blank=True, null=True)

    # ── Blockchain audit trail ────────────────────────────────────────────
    blockchain_block_index = models.IntegerField(
        null=True,
        blank=True,
        help_text='Index of the blockchain block recording this event.',
    )
    blockchain_hash     = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text='SHA-256 hash of the blockchain block for tamper detection.',
    )

    # ── Timestamps ───────────────────────────────────────────────────────
    verified_at         = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-verified_at']
        verbose_name = 'Face Verification Report'
        verbose_name_plural = 'Face Verification Reports'
        indexes = [
            models.Index(fields=['status', 'verified_at']),
        ]

    def __str__(self):
        citizen_str = str(self.citizen) if self.citizen else 'Unknown'
        return (
            f"FaceVerify [{self.status}] "
            f"by {citizen_str} | "
            f"sim={self.similarity_pct:.1f}% | "
            f"{self.verified_at.strftime('%Y-%m-%d %H:%M')}"
        )

    # ── Computed helpers ──────────────────────────────────────────────────
    @property
    def is_verified(self) -> bool:
        return self.status == 'VERIFIED'

    @property
    def confidence_label(self) -> str:
        """Human-readable confidence label based on similarity."""
        pct = self.similarity_pct
        if pct >= 90:
            return 'High'
        if pct >= 70:
            return 'Medium'
        if pct > 0:
            return 'Low'
        return 'None'


class FaceVerificationLog(models.Model):
    """
    Lightweight, append-only audit log for every verification API request.
    Created even for requests that fail before a report is generated.
    """

    report = models.OneToOneField(
        FaceVerificationReport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='log',
    )
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    user_agent  = models.TextField(blank=True, null=True)
    request_at  = models.DateTimeField(auto_now_add=True)
    citizen_cnic = models.CharField(max_length=15, blank=True, null=True)

    class Meta:
        ordering = ['-request_at']
        verbose_name = 'Face Verification Log'
        verbose_name_plural = 'Face Verification Logs'

    def __str__(self):
        return (
            f"Log [{self.citizen_cnic}] "
            f"IP={self.ip_address} "
            f"@ {self.request_at.strftime('%Y-%m-%d %H:%M:%S')}"
        )
