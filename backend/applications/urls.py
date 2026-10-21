from django.urls import path
from .views import (
    ApplicationListCreateView, ApplicationDetailView, StaffApplicationQueueView,
    UploadDocumentView, DocumentFileView,
    AIFaceVerifyView, ProcessPaymentView,
    StaffRemarkView, StaffForwardView, StaffConfirmView, StaffVerifyPaymentView,
    AuthorityDecisionView, IssueCertificateView,
    CertificateIntegrityVerificationView,
    CertificateManagementListView, CertificateManagementDetailView,
    StaffListCreateView, StaffDetailView, StaffToggleActiveView, StaffResetPasswordView,
    AuthorityAnalyticsView,
    PublicCertificateVerifyView, DownloadCertificatePDFView,
    PublicPortalStatsView,
)

urlpatterns = [
    path('public/stats/', PublicPortalStatsView.as_view()),
    # ── Citizen ──────────────────────────────────────────────────────────────
    path('citizen/applications/',                          ApplicationListCreateView.as_view()),
    path('citizen/applications/<int:pk>/',                 ApplicationDetailView.as_view()),
    path('citizen/applications/<int:pk>/upload/',          UploadDocumentView.as_view()),
    path('documents/<int:pk>/file/',                       DocumentFileView.as_view(), name='document-file'),
    path('citizen/applications/<int:pk>/face-verify/',     AIFaceVerifyView.as_view()),
    path('citizen/applications/<int:pk>/pay/',             ProcessPaymentView.as_view()),
    path('citizen/applications/<int:pk>/download-certificate/', DownloadCertificatePDFView.as_view()),

    # ── Police Staff ──────────────────────────────────────────────────────────
    path('staff/applications/',                             StaffApplicationQueueView.as_view()),
    path('staff/applications/<int:pk>/remark/',            StaffRemarkView.as_view()),
    path('staff/applications/<int:pk>/forward/',           StaffForwardView.as_view()),
    path('staff/applications/<int:pk>/confirm/',           StaffConfirmView.as_view()),
    path('staff/applications/<int:pk>/verify-payment/',    StaffVerifyPaymentView.as_view()),
    path('staff/applications/<int:pk>/issue-cert/',        IssueCertificateView.as_view()),  # updated role
    path('staff/certificates/verify-integrity/',            CertificateIntegrityVerificationView.as_view()),

    # ── Police Authority ──────────────────────────────────────────────────────
    path('police/certificates/',                           CertificateManagementListView.as_view()),
    path('police/certificates/<str:certificate_number>/',  CertificateManagementDetailView.as_view()),
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
