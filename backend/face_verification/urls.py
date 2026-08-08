"""
face_verification/urls.py
==========================
URL routing for the face verification module.
All routes are authenticated (enforced in views via IsAuthenticated).
"""

from django.urls import path
from .views import (
    LiveFaceVerifyView,
    VerificationHistoryView,
    VerificationReportDetailView,
    EmbeddingStoreStatusView,
)

app_name = 'face_verification'

urlpatterns = [
    # POST — run live verification
    path(
        'verify/',
        LiveFaceVerifyView.as_view(),
        name='live-verify',
    ),
    # GET — citizen's verification history
    path(
        'history/',
        VerificationHistoryView.as_view(),
        name='history',
    ),
    # GET — full report details
    path(
        'report/<uuid:report_id>/',
        VerificationReportDetailView.as_view(),
        name='report-detail',
    ),
    # GET — embedding store health
    path(
        'status/',
        EmbeddingStoreStatusView.as_view(),
        name='store-status',
    ),
]
