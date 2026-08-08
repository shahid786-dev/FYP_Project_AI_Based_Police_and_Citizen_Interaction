"""
face_verification/admin.py
===========================
Admin registration for the face verification models.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import FaceVerificationReport, FaceVerificationLog


@admin.register(FaceVerificationReport)
class FaceVerificationReportAdmin(admin.ModelAdmin):
    list_display = [
        'report_id_short',
        'citizen',
        'status_badge',
        'similarity_pct_display',
        'matched_citizen_name',
        'matched_cnic',
        'model_used',
        'verified_at',
    ]
    list_filter = ['status', 'confidence_level', 'model_used', 'verified_at']
    search_fields = [
        'citizen__cnic',
        'citizen__full_name',
        'matched_cnic',
        'matched_citizen_name',
        'report_id',
    ]
    readonly_fields = [
        'report_id', 'verified_at',
        'blockchain_block_index', 'blockchain_hash',
    ]
    date_hierarchy = 'verified_at'
    ordering = ['-verified_at']

    def report_id_short(self, obj):
        return str(obj.report_id)[:8] + '…'
    report_id_short.short_description = 'Report ID'

    def status_badge(self, obj):
        colors = {
            'VERIFIED': '#28a745',
            'FAILED': '#dc3545',
            'NO_FACE': '#fd7e14',
            'MULTIPLE_FACES': '#fd7e14',
            'LOW_QUALITY': '#6c757d',
            'EMBEDDING_ERROR': '#dc3545',
            'DB_ERROR': '#dc3545',
            'STORE_NOT_READY': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;">{}</span>',
            color,
            obj.get_status_display(),
        )
    status_badge.short_description = 'Status'
    status_badge.allow_tags = True

    def similarity_pct_display(self, obj):
        return f"{obj.similarity_pct:.2f}%"
    similarity_pct_display.short_description = 'Similarity'


@admin.register(FaceVerificationLog)
class FaceVerificationLogAdmin(admin.ModelAdmin):
    list_display = ['citizen_cnic', 'ip_address', 'request_at', 'report']
    list_filter = ['request_at']
    search_fields = ['citizen_cnic', 'ip_address']
    readonly_fields = ['request_at', 'report', 'ip_address', 'user_agent', 'citizen_cnic']
    ordering = ['-request_at']
