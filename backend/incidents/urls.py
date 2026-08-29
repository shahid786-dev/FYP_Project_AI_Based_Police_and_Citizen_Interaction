from django.urls import path
from .views import (
    EmergencySOSCreateView, EmergencySOSListView, EmergencySOSUpdateView,
    ComplaintListCreateView, ComplaintDetailView, ComplaintAssignOfficerView,
    IncidentEvidenceUploadView, UnifiedTrackView
)

urlpatterns = [
    path('sos/', EmergencySOSCreateView.as_view(), name='sos-create'),
    path('sos/list/', EmergencySOSListView.as_view(), name='sos-list'),
    path('sos/<int:pk>/status/', EmergencySOSUpdateView.as_view(), name='sos-update'),
    
    path('complaints/', ComplaintListCreateView.as_view(), name='complaint-list-create'),
    path('complaints/<int:pk>/', ComplaintDetailView.as_view(), name='complaint-detail'),
    path('complaints/<int:pk>/assign/', ComplaintAssignOfficerView.as_view(), name='complaint-assign'),
    
    path('evidence/upload/', IncidentEvidenceUploadView.as_view(), name='evidence-upload'),
    path('track/<str:track_id>/', UnifiedTrackView.as_view(), name='unified-track'),
]
