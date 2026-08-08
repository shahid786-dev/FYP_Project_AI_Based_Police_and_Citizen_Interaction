"""
face_verification/serializers.py
=================================
DRF serializers for the face verification API.
"""

from rest_framework import serializers
from .models import FaceVerificationReport, FaceVerificationLog


class FaceVerificationReportSerializer(serializers.ModelSerializer):
    """Full report serializer — used for detail views and history."""

    citizen_name = serializers.SerializerMethodField()
    citizen_cnic = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    confidence_level_display = serializers.CharField(
        source='get_confidence_level_display', read_only=True
    )
    is_verified = serializers.BooleanField(read_only=True)
    similarity_pct_display = serializers.SerializerMethodField()

    class Meta:
        model = FaceVerificationReport
        fields = [
            'report_id',
            'citizen_name',
            'citizen_cnic',
            'matched_citizen_name',
            'matched_father_name',
            'matched_cnic',
            'similarity_score',
            'similarity_pct',
            'similarity_pct_display',
            'status',
            'status_display',
            'confidence_level',
            'confidence_level_display',
            'is_verified',
            'threshold_used',
            'model_used',
            'embedding_dim',
            'processing_time_ms',
            'error_code',
            'error_message',
            'blockchain_block_index',
            'blockchain_hash',
            'verified_at',
        ]
        read_only_fields = fields

    def get_citizen_name(self, obj):
        return obj.citizen.full_name if obj.citizen else None

    def get_citizen_cnic(self, obj):
        return obj.citizen.cnic if obj.citizen else None

    def get_similarity_pct_display(self, obj):
        return f"{obj.similarity_pct:.2f}%"


class FaceVerificationReportSummarySerializer(serializers.ModelSerializer):
    """Compact serializer for history lists."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = FaceVerificationReport
        fields = [
            'report_id',
            'status',
            'status_display',
            'is_verified',
            'similarity_pct',
            'matched_citizen_name',
            'verified_at',
        ]
        read_only_fields = fields


class VerificationRequestSerializer(serializers.Serializer):
    """
    Validates the incoming verification request.
    Accepts a live image (multipart file upload).
    """
    live_image = serializers.ImageField(
        required=True,
        allow_empty_file=False,
        help_text='Live webcam capture (JPEG or PNG). Max 5 MB.',
    )
    application_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='Optional: Link this verification to a police application.',
    )

    def validate_live_image(self, value):
        # Enforce max file size: 5 MB
        max_size = 5 * 1024 * 1024  # 5 MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f'Image file too large ({value.size // 1024} KB). Maximum allowed is 5 MB.'
            )
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        content_type = getattr(value, 'content_type', '')
        if content_type and content_type not in allowed_types:
            raise serializers.ValidationError(
                f'Unsupported image format: {content_type}. '
                'Please upload a JPEG, PNG, or WebP image.'
            )
        return value


class EmbeddingStoreStatusSerializer(serializers.Serializer):
    """Status of the in-memory embedding store."""
    ready         = serializers.BooleanField()
    total_records = serializers.IntegerField(required=False)
    model         = serializers.CharField(required=False)
    error         = serializers.CharField(required=False, allow_null=True)
