from django.urls import path
from .views import (
    ApplicationListCreateView, ApplicationDetailView, UploadDocumentView,
    AIFaceVerifyView, ProcessPaymentView,
    StaffRemarkView,
    AuthorityDecisionView, IssueCertificateView,
    PoliceReviewApplicationView,
    StaffListCreateView, StaffDetailView, StaffToggleActiveView, StaffResetPasswordView,
    AuthorityAnalyticsView,
    PublicCertificateVerifyView, DownloadCertificatePDFView,
)

urlpatterns = [
    # ── Citizen ──────────────────────────────────────────────────────────────
    path('citizen/applications/',                          ApplicationListCreateView.as_view()),
    path('citizen/applications/<int:pk>/',                 ApplicationDetailView.as_view()),
    path('citizen/applications/<int:pk>/upload/',          UploadDocumentView.as_view()),
    path('citizen/applications/<int:pk>/face-verify/',     AIFaceVerifyView.as_view()),
    path('citizen/applications/<int:pk>/pay/',             ProcessPaymentView.as_view()),
    path('citizen/applications/<int:pk>/download-certificate/', DownloadCertificatePDFView.as_view()),

    # ── Police Staff ──────────────────────────────────────────────────────────
    path('staff/applications/<int:pk>/remark/',            StaffRemarkView.as_view()),
    path('police/applications/<int:pk>/review/',           PoliceReviewApplicationView.as_view()),

    # ── Police Authority ──────────────────────────────────────────────────────
    path('authority/applications/<int:pk>/decide/',        AuthorityDecisionView.as_view()),
    path('authority/applications/<int:pk>/issue-cert/',    IssueCertificateView.as_view()),
    path('authority/staff/',                               StaffListCreateView.as_view()),
    path('authority/staff/<int:pk>/',                      StaffDetailView.as_view()),
    path('authority/staff/<int:pk>/toggle-active/',        StaffToggleActiveView.as_view()),
    path('authority/staff/<int:pk>/reset-password/',       StaffResetPasswordView.as_view()),
    path('police/analytics/',                              AuthorityAnalyticsView.as_view()),

    # ── Public ────────────────────────────────────────────────────────────────
    path('certificates/verify/<str:certificate_number>/',  PublicCertificateVerifyView.as_view()),
]
