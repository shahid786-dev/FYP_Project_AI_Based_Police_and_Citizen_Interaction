from rest_framework import serializers
from .models import NADRARecord, NADRAVerification


class NADRARecordSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NADRARecord
        fields = ['id', 'cnic', 'full_name', 'father_name',
                  'date_of_birth', 'gender', 'district', 'province', 'is_active']


class NADRAVerificationSerializer(serializers.ModelSerializer):
    result_display = serializers.CharField(source='get_result_display', read_only=True)

    class Meta:
        model  = NADRAVerification
        fields = ['id', 'application', 'result', 'result_display',
                  'similarity_score', 'checked_at', 'notes']
