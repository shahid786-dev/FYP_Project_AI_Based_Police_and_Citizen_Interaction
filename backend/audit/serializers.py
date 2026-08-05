from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default='Anonymous')

    class Meta:
        model = AuditLog
        fields = ('id', 'user_name', 'action', 'endpoint', 'method', 'ip_address', 'status_code', 'timestamp', 'block_index', 'previous_hash', 'block_hash')

