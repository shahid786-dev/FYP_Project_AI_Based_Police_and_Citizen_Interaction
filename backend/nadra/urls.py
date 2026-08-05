from django.urls import path
from .views import NADRAVerificationStatusView

urlpatterns = [
    path('status/<int:application_pk>/', NADRAVerificationStatusView.as_view(), name='nadra-status'),
]
