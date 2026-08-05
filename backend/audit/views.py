from rest_framework import generics, permissions
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != 'SUPER_ADMIN':
            return AuditLog.objects.none()
        return AuditLog.objects.select_related('user').order_by('-timestamp')[:500]
