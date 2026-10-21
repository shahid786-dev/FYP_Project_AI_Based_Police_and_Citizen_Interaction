from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.urls import reverse
from .models import Application, Document, Challan, Certificate, Payment
from users.serializers import UserSerializer

User = get_user_model()

class DocumentSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ('id', 'document_type', 'file', 'uploaded_at')

    def get_file(self, obj):
        return reverse('document-file', kwargs={'pk': obj.pk})

class ChallanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Challan
        fields = ('id', 'challan_number', 'amount', 'due_date', 'status', 'paid_at', 'payment_method')

class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = ('id', 'certificate_number', 'issue_date', 'validity_expiry', 'qr_code_hash', 'digital_signature', 'verification_url', 'status', 'pdf_file', 'certificate_hash', 'blockchain_transaction_hash', 'created_at', 'updated_at')


class CertificateManagementSerializer(serializers.ModelSerializer):
    applicant = serializers.SerializerMethodField()
    application = serializers.SerializerMethodField()
    approval = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = (
            'id', 'certificate_number', 'issue_date', 'validity_expiry',
            'qr_code_hash', 'verification_url', 'status', 'certificate_hash',
            'blockchain_transaction_hash', 'created_at', 'applicant',
            'application', 'approval',
        )

    def get_applicant(self, obj):
        user = obj.application.applicant
        cnic = user.cnic or ''
        masked_cnic = f"{cnic[:5]}-*******-{cnic[-1:]}" if len(cnic) >= 7 else None
        return {
            'id': user.pk,
            'full_name': user.full_name,
            'cnic': masked_cnic,
        }

    def get_application(self, obj):
        application = obj.application
        province = application.applicant_province or application.applicant.province or None
        from applications.certificate_service import get_authority_name

        return {
            'id': application.pk,
            'tracking_id': application.tracking_id,
            'certificate_type': application.application_type,
            'status': application.status,
            'province': province,
            'issuing_authority': get_authority_name(province or ''),
        }

    def get_approval(self, obj):
        application = obj.application
        try:
            payment = application.payment_record
        except Payment.DoesNotExist:
            payment = None
        return {
            'staff_reviewer': application.staff_reviewed_by.full_name if application.staff_reviewed_by else None,
            'staff_reviewed_at': application.staff_reviewed_at,
            'authority_decider': application.admin_decided_by.full_name if application.admin_decided_by else None,
            'authority_decided_at': application.admin_decided_at,
            'payment_verified': payment.is_verified if payment else False,
            'payment_verified_at': payment.verified_at if payment else None,
            'payment_verified_by': payment.verified_by.full_name if payment and payment.verified_by else None,
        }


class ApplicationSerializer(serializers.ModelSerializer):
    applicant = UserSerializer(read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    challan = ChallanSerializer(read_only=True)
    certificate = CertificateSerializer(read_only=True)
    nadra_details = serializers.SerializerMethodField()
    criminal_check = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = (
            'id', 'applicant', 'application_type', 'purpose', 'current_address',
            'nearest_station', 'applicant_province', 'status', 'notes', 'tracking_id',
            'face_confidence', 'liveness_score', 'submitted_at', 'updated_at',
            'documents', 'challan', 'certificate', 'nadra_details', 'criminal_check'
        )

    def get_criminal_check(self, obj):
        try:
            check = obj.criminal_check
        except Exception:
            return None
        return {
            'result': check.result,
            'summary': check.report_summary,
            'checked_at': check.checked_at,
            'matched_record_id': check.matched_record_id,
        }

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

        def first_actual_value(*values):
            placeholders = {'n/a', 'na', 'none', 'unknown', 'not available', 'not provided'}
            for value in values:
                if value is None:
                    continue
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                text = str(value).strip()
                normalized = text.casefold()
                if not text or normalized in placeholders:
                    continue
                if normalized.startswith('citizen (') and normalized.endswith(')'):
                    continue
                return text
            return None

        province = first_actual_value(
            report.matched_province if report else None,
            nadra_rec.province if nadra_rec else None,
            getattr(applicant, 'province', None),
            obj.applicant_province,
        )
        district = first_actual_value(
            report.matched_district if report else None,
            nadra_rec.district if nadra_rec else None,
            getattr(applicant, 'district', None),
        )
        permanent_address = first_actual_value(
            report.matched_address if report else None,
            nadra_rec.address if nadra_rec else None,
            getattr(applicant, 'address', None),
        )
        full_name = first_actual_value(
            report.matched_citizen_name if report else None,
            nadra_rec.full_name if nadra_rec else None,
            getattr(applicant, 'full_name', None),
        )
        father_name = first_actual_value(
            report.matched_father_name if report else None,
            nadra_rec.father_name if nadra_rec else None,
            getattr(applicant, 'father_name', None),
        )
        date_of_birth = first_actual_value(
            report.matched_date_of_birth if report else None,
            nadra_rec.date_of_birth if nadra_rec else None,
            getattr(applicant, 'dob', None),
        )
        gender = first_actual_value(
            report.matched_gender if report else None,
            nadra_rec.get_gender_display() if nadra_rec else None,
            getattr(applicant, 'gender', None),
        )

        return {
            'full_name':    full_name,
            'cnic':         (report.matched_cnic if report and report.matched_cnic else (nadra_rec.cnic if nadra_rec else applicant.cnic)),
            'father_name':  father_name,
            'date_of_birth': date_of_birth,
            'gender':       gender,
            'address':      permanent_address,
            'permanent_address': permanent_address,
            'district':     district,
            'province':    province,
            'face_image_url':(report.matched_photo_url if report and report.matched_photo_url else (nadra_rec.face_image.url if nadra_rec and nadra_rec.face_image else None)),
            'similarity_score': report.similarity_pct if report else (obj.face_confidence or None),
            'is_verified':  (report.is_verified if report else obj.status in ['FACE_VERIFIED', 'CRIMINAL_CHECKED', 'STAFF_REVIEWED', 'AUTHORITY_APPROVED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'COMPLETED']),
            'status':       report.status if report else 'VERIFIED'
        }

class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ('application_type', 'purpose', 'current_address', 'nearest_station')
