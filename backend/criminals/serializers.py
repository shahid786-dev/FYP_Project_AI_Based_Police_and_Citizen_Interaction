from rest_framework import serializers
from .models import CriminalRecord

class CriminalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriminalRecord
        fields = '__all__'
