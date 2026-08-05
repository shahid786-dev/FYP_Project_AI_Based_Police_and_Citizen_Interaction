from django.urls import path
from .views import (
    BlockchainBlockListView, BlockchainBlockDetailView,
    BlockchainVerifyView, BlockchainRecordHistoryView,
)

urlpatterns = [
    path('blocks/',               BlockchainBlockListView.as_view(),   name='blockchain-block-list'),
    path('blocks/<int:pk>/',      BlockchainBlockDetailView.as_view(), name='blockchain-block-detail'),
    path('verify/',               BlockchainVerifyView.as_view(),       name='blockchain-verify'),
    path('record/<str:record_id>/', BlockchainRecordHistoryView.as_view(), name='blockchain-record-history'),
]
