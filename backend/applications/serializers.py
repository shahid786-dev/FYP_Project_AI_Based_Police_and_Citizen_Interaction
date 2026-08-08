from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Application, Document, Challan, Certificate
from users.serializers import UserSerializer

User = get_user_model()

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ('id', 'document_type', 'file', 'uploaded_at')

class ChallanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Challan
        fields = ('id', 'challan_number', 'amount', 'due_date', 'status', 'paid_at', 'payment_method')

class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = ('id', 'certificate_number', 'issue_date', 'validity_expiry', 'qr_code_hash', 'digital_signature', 'verification_url', 'status', 'pdf_file', 'certificate_hash', 'blockchain_transaction_hash', 'created_at', 'updated_at')

class ApplicationSerializer(serializers.ModelSerializer):
    applicant = UserSerializer(read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    challan = ChallanSerializer(read_only=True)
    certificate = CertificateSerializer(read_only=True)

    class Meta:
        model = Application
        fields = (
            'id', 'applicant', 'application_type', 'purpose', 'current_address',
            'nearest_station', 'status', 'notes', 'tracking_id', 'face_confidence',
            'liveness_score', 'submitted_at', 'updated_at', 'documents', 'challan', 'certificate'
        )

class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ('application_type', 'purpose', 'current_address', 'nearest_station')
