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
    nadra_details = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = (
            'id', 'applicant', 'application_type', 'purpose', 'current_address',
            'nearest_station', 'applicant_province', 'status', 'notes', 'tracking_id',
            'face_confidence', 'liveness_score', 'submitted_at', 'updated_at',
            'documents', 'challan', 'certificate', 'nadra_details'
        )

    def get_nadra_details(self, obj):
        from django.db import models
        from nadra.models import NADRARecord
        from face_verification.models import FaceVerificationReport
        
        report = FaceVerificationReport.objects.filter(
            models.Q(application=obj) | models.Q(citizen=obj.applicant)
        ).order_by('-verified_at').first()
        
        nadra_rec = None
        if report and report.matched_cnic:
            nadra_rec = NADRARecord.objects.filter(cnic=report.matched_cnic).first()
        if not nadra_rec and obj.applicant and obj.applicant.cnic:
            nadra_rec = NADRARecord.objects.filter(cnic=obj.applicant.cnic).first()
            
        applicant = obj.applicant

        # Province: NADRA report > NADRA record > application snapshot > user profile > None (never invent)
        province = (
            (report.matched_province if report and report.matched_province else None)
            or (nadra_rec.province if nadra_rec and nadra_rec.province else None)
            or obj.applicant_province
            or getattr(applicant, 'province', None)
            or None  # DO NOT silently substitute a province
        )

        # District: same priority chain
        district = (
            (report.matched_district if report and report.matched_district else None)
            or (nadra_rec.district if nadra_rec and nadra_rec.district else None)
            or getattr(applicant, 'district', None)
            or None  # DO NOT silently substitute a district
        )

        return {
            'full_name':    (report.matched_citizen_name if report and report.matched_citizen_name else (nadra_rec.full_name if nadra_rec else applicant.full_name)),
            'cnic':         (report.matched_cnic if report and report.matched_cnic else (nadra_rec.cnic if nadra_rec else applicant.cnic)),
            'father_name':  (report.matched_father_name if report and report.matched_father_name else (nadra_rec.father_name if nadra_rec else getattr(applicant, 'father_name', None))),
            'date_of_birth':(report.matched_date_of_birth if report and report.matched_date_of_birth else (str(nadra_rec.date_of_birth) if nadra_rec and nadra_rec.date_of_birth else str(getattr(applicant, 'dob', None)))),
            'gender':       (report.matched_gender if report and report.matched_gender else (nadra_rec.get_gender_display() if nadra_rec and hasattr(nadra_rec, 'get_gender_display') else getattr(applicant, 'gender', None))),
            'address':      (report.matched_address if report and report.matched_address else (nadra_rec.address if nadra_rec and nadra_rec.address else (obj.current_address or getattr(applicant, 'address', None)))),
            'district':     district,
            'province':     province,
            'face_image_url':(report.matched_photo_url if report and report.matched_photo_url else (nadra_rec.face_image.url if nadra_rec and nadra_rec.face_image else None)),
            'similarity_score': report.similarity_pct if report else (obj.face_confidence or None),
            'is_verified':  (report.is_verified if report else obj.status in ['FACE_VERIFIED', 'CRIMINAL_CHECKED', 'STAFF_REVIEWED', 'AUTHORITY_APPROVED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'COMPLETED']),
            'status':       report.status if report else 'VERIFIED'
        }

class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ('application_type', 'purpose', 'current_address', 'nearest_station')
