from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import EmergencySOS, Complaint, IncidentEvidence

User = get_user_model()

class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'cnic', 'mobile_number', 'role']

class IncidentEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserSimpleSerializer(source='uploaded_by', read_only=True)

    class Meta:
        model = IncidentEvidence
        fields = ['id', 'complaint', 'sos', 'file', 'file_type', 'description', 'uploaded_by', 'uploaded_by_details', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by']

class EmergencySOSSerializer(serializers.ModelSerializer):
    citizen_details = UserSimpleSerializer(source='citizen', read_only=True)
    assigned_officer_details = UserSimpleSerializer(source='assigned_officer', read_only=True)
    evidence = IncidentEvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = EmergencySOS
        fields = [
            'id', 'sos_id', 'citizen', 'citizen_details', 'emergency_type',
            'latitude', 'longitude', 'location_address', 'description',
            'contact_number', 'status', 'assigned_officer', 'assigned_officer_details',
            'police_notes', 'evidence', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sos_id', 'created_at', 'updated_at']

class ComplaintSerializer(serializers.ModelSerializer):
    citizen_details = UserSimpleSerializer(source='citizen', read_only=True)
    assigned_officer_details = UserSimpleSerializer(source='assigned_officer', read_only=True)
    evidence = IncidentEvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_id', 'citizen', 'citizen_details', 'category',
            'title', 'description', 'incident_date', 'incident_time',
            'location_address', 'district', 'nearest_station', 'priority',
            'status', 'assigned_officer', 'assigned_officer_details',
            'suspect_details', 'stolen_items_value', 'witness_info',
            'is_helper_witness', 'resolution_notes', 'evidence',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'complaint_id', 'created_at', 'updated_at']
