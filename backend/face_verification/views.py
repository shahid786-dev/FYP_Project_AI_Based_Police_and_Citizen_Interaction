"""
face_verification/views.py
===========================
DRF views for the AI Face Verification API.

Endpoints
---------
POST   /api/face-verify/verify/          — Run live face verification
GET    /api/face-verify/history/         — Citizen's verification history
GET    /api/face-verify/report/<uuid>/   — Retrieve a specific report
GET    /api/face-verify/status/          — Embedding store health status
"""

import logging

from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FaceVerificationReport
from .serializers import (
    FaceVerificationReportSerializer,
    FaceVerificationReportSummarySerializer,
    VerificationRequestSerializer,
    EmbeddingStoreStatusSerializer,
)
from .service import FaceVerificationService

logger = logging.getLogger('face_verification')


def _get_client_ip(request) -> str:
    """Extract real client IP, respecting proxy headers."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')


class LiveFaceVerifyView(APIView):
    """
    POST /api/face-verify/verify/
    ==============================
    Accepts a live webcam image (multipart upload), runs the full
    face verification pipeline, and returns a structured report.

    Authentication: Bearer JWT required.
    Permission: Citizen must be authenticated.

    Request (multipart/form-data)
    ─────────────────────────────
    live_image      : File   — JPEG/PNG webcam capture (required)
    application_id  : int    — Link to police application (optional)

    Response 200
    ────────────
    {
        "success": true,
        "report": { ... FaceVerificationReport fields ... },
        "message": "Verification successful — Identity confirmed."
    }

    Response 400 / 200 (with error)
    ───────────────────────────────
    Failed verifications still return HTTP 200 with success=false.
    Only malformed requests return HTTP 400.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # ── Validate request ─────────────────────────────────────────────
        serializer = VerificationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Read image bytes ─────────────────────────────────────────────
        live_image_file = serializer.validated_data['live_image']
        application_id  = serializer.validated_data.get('application_id')
        image_bytes     = live_image_file.read()

        # ── Resolve optional application ─────────────────────────────────
        application = None
        if application_id:
            try:
                from applications.models import Application
                application = Application.objects.get(
                    id=application_id,
                    applicant=request.user,
                )
            except Exception:
                pass  # Non-fatal — we just don't link the application

        # ── Run verification ─────────────────────────────────────────────
        report = FaceVerificationService.verify(
            image_bytes=image_bytes,
            citizen=request.user,
            application=application,
            ip_address=_get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        # ── Serialize and respond ────────────────────────────────────────
        report_data = FaceVerificationReportSerializer(report).data

        if report.is_verified:
            message = (
                f"✅ Verification successful — Identity confirmed. "
                f"Matched: {report.matched_citizen_name} "
                f"(Similarity: {report.similarity_pct:.2f}%)"
            )
        elif report.status == 'NO_FACE':
            message = "❌ No face detected. Please ensure your face is clearly visible."
        elif report.status == 'MULTIPLE_FACES':
            message = "❌ Multiple faces detected. Please verify alone."
        elif report.status == 'LOW_QUALITY':
            message = "❌ Image quality too low. Improve lighting and try again."
        elif report.status == 'STORE_NOT_READY':
            message = "⚠️ Verification system not ready. Contact administrator."
        else:
            message = (
                "❌ Verification failed — your face did not match any NADRA record "
                f"with ≥{int(report.threshold_used * 100)}% confidence."
            )

        return Response({
            'success': report.is_verified,
            'report': report_data,
            'message': message,
        })


class VerificationHistoryView(APIView):
    """
    GET /api/face-verify/history/?limit=10
    ========================================
    Returns the authenticated citizen's N most recent verification reports.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 10)), 50)
        reports = FaceVerificationService.get_citizen_history(request.user, limit=limit)
        serializer = FaceVerificationReportSummarySerializer(reports, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data,
        })


class VerificationReportDetailView(APIView):
    """
    GET /api/face-verify/report/<report_id>/
    ==========================================
    Returns the full details of a specific verification report.
    Citizens can only access their own reports.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        try:
            report = FaceVerificationService.get_report_by_id(report_id, request.user)
        except FaceVerificationReport.DoesNotExist:
            return Response(
                {'error': 'Report not found or access denied.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = FaceVerificationReportSerializer(report)
        return Response(serializer.data)


class EmbeddingStoreStatusView(APIView):
    """
    GET /api/face-verify/status/
    ==============================
    Returns the health and readiness of the NADRA face embedding store.
    Useful for admin dashboards and system health checks.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_status = FaceVerificationService.get_store_status()
        serializer = EmbeddingStoreStatusSerializer(data=store_status)
        serializer.is_valid()  # always valid — we control the data
        return Response(store_status)
