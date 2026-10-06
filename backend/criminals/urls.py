from django.urls import path
from .views import CriminalRecordSearchView, CriminalRecordAdminView, CriminalCheckApplicationView

urlpatterns = [
    path('search/', CriminalRecordSearchView.as_view(), name='criminal-search'),
    path('records/', CriminalRecordAdminView.as_view(), name='criminal-records-admin'),
    path('applications/<int:application_pk>/check/', CriminalCheckApplicationView.as_view(), name='criminal-check-application'),
]
