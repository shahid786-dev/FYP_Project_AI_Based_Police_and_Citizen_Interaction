from django.urls import path
from .views import NotificationListView, MarkReadView, MarkAllReadView, UnreadCountView

urlpatterns = [
    path('',                    NotificationListView.as_view(), name='notification-list'),
    path('unread-count/',       UnreadCountView.as_view(),      name='notification-unread-count'),
    path('read-all/',           MarkAllReadView.as_view(),      name='notification-read-all'),
    path('<int:pk>/read/',      MarkReadView.as_view(),         name='notification-mark-read'),
]
