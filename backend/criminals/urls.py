from django.urls import path
from .views import CriminalRecordSearchView, CriminalRecordAdminView

urlpatterns = [
    path('search/', CriminalRecordSearchView.as_view(), name='criminal-search'),
    path('records/', CriminalRecordAdminView.as_view(), name='criminal-records-admin'),
]
