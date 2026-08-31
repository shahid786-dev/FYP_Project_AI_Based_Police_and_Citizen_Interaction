from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Count, Sum, Q
import requests, datetime, io, uuid, qrcode
import logging

logger = logging.getLogger(__name__)

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch

from .models import Application, Document, Challan, Certificate, Payment
from .serializers import ApplicationSerializer, ApplicationCreateSerializer, DocumentSerializer

from blockchain.service import BlockchainService
from notifications.service import (
    notify_application_submitted, notify_ai_verified, notify_nadra_verified,
    notify_criminal_checked, notify_staff_reviewed, notify_authority_decision,
    notify_challan_generated, notify_payment_confirmed, notify_certificate_ready,
)

User = get_user_model()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _generate_challan(application):
    due_date = timezone.now().date() + datetime.timedelta(days=14)
    challan  = Challan.objects.create(application=application, due_date=due_date, status='PENDING')
    application.status = 'PAYMENT_PENDING'
    application.save()
    BlockchainService.add_block(
        'CHALLAN_GENERATE', str(application.id),
        application.applicant.cnic,
        {'challan_number': challan.challan_number, 'amount': str(challan.amount),
         'tracking_id': application.tracking_id},
    )
    notify_challan_generated(
        application.applicant, application.tracking_id,
        challan.challan_number, challan.amount,
    )
    return challan


def _generate_qr_bytes(url: str) -> bytes:
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


# ─── Citizen — Applications ───────────────────────────────────────────────────

class ApplicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return ApplicationCreateSerializer if self.request.method == 'POST' else ApplicationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            # Province-scoped admins see their own province's applications
            if user.province:
                return Application.objects.filter(applicant_province=user.province).order_by('-submitted_at')
            return Application.objects.all().order_by('-submitted_at')
        if user.role in ['POLICE_STAFF', 'POLICE_AUTHORITY']:
            return Application.objects.all().order_by('-submitted_at')
        return Application.objects.filter(applicant=user).order_by('-submitted_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save(
            applicant=request.user,
            applicant_province=request.user.province or ''
        )

        BlockchainService.add_block(
            'APPLICATION_SUBMIT', str(application.id), request.user.cnic,
            {'tracking_id': application.tracking_id,
             'application_type': application.application_type,
             'purpose': application.purpose,
             'province': application.applicant_province},
        )
        notify_application_submitted(request.user, application.tracking_id)

        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class ApplicationDetailView(generics.RetrieveAPIView):
    serializer_class   = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Application.objects.all()
        return Application.objects.filter(applicant=user)


class UploadDocumentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            application = Application.objects.get(pk=pk, applicant=request.user)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

        document_type = request.data.get('document_type')
        file_obj      = request.FILES.get('file')
        if not document_type or not file_obj:
            return Response({'error': 'Document type and file are required.'}, status=400)

        Document.objects.filter(application=application, document_type=document_type).delete()
        doc = Document.objects.create(application=application, document_type=document_type, file=file_obj)

        BlockchainService.add_block(
            'DOCUMENT_UPLOAD', str(application.id), request.user.cnic,
            {'document_type': document_type, 'tracking_id': application.tracking_id},
        )
        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class AIFaceVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            application = Application.objects.get(pk=pk, applicant=request.user)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=404)

        if application.status != 'PENDING':
            # Safely recognize the current state and return success if already verified
            if application.status in ['FACE_VERIFIED', 'CRIMINAL_CHECK', 'CRIMINAL_CHECKED', 'STAFF_REVIEWED', 'FORWARDED_TO_ADMIN', 'AUTHORITY_APPROVED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED', 'APPROVED', 'COMPLETED']:
                return Response({
                    'message': 'Face verification already completed successfully.',
                    'confidence': application.face_confidence or 100.0,
                    'liveness_score': application.liveness_score or 1.0,
                    'status': application.status,
                })

        live_image = request.FILES.get('live_image')
        confidence, liveness = 94.6, 0.98   # simulation defaults

        if live_image:
            from deepface import DeepFace
            import tempfile
            import os

            try:
                # Get user's NADRA record
                from nadra.models import NADRARecord
                nadra_record = NADRARecord.objects.filter(cnic=request.user.cnic).first()

                if nadra_record and nadra_record.face_image:
                    # Save live image temporarily to pass to DeepFace
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                        for chunk in live_image.chunks():
                            tmp.write(chunk)
                        tmp_path = tmp.name

                    try:
                        # Perform verification
                        result = DeepFace.verify(
                            img1_path=tmp_path,
                            img2_path=nadra_record.face_image.path,
                            model_name='Facenet',
                            enforce_detection=False
                        )
                        
                        # Distance goes from 0 (same) to threshold (usually ~0.4 for Facenet)
                        # Let's map it to confidence score 0-100%
                        distance = result.get('distance', 1.0)
                        threshold = result.get('threshold', 0.40)
                        
                        if distance < threshold:
                            confidence = 100 - (distance / threshold * 30) # Maps to 70-100
                        else:
                            confidence = max(0, 70 - ((distance - threshold) * 100))
                            
                        # Keep simulated liveness for now since DeepFace doesn't do anti-spoofing
                        liveness = 0.95
                        
                    finally:
                        os.unlink(tmp_path)
                else:
                    return Response({'error': 'NADRA biometric record not found for this user.'}, status=400)
                    
            except Exception as e:
                return Response({'error': f'Face verification failed: {str(e)}'}, status=500)

        application.face_confidence  = confidence
        application.liveness_score   = liveness
        application.status           = 'FACE_VERIFIED' if confidence >= 70.0 else 'REJECTED'
        application.save()

        BlockchainService.add_block(
            'AI_FACE_VERIFY', str(application.id), request.user.cnic,
            {'confidence': confidence, 'liveness': liveness,
             'result': application.status, 'tracking_id': application.tracking_id},
        )
        notify_ai_verified(request.user, application.tracking_id, confidence)

        if application.status == 'FACE_VERIFIED':
            logger.info('Application %s progressed to FACE_VERIFIED. Awaiting Police Staff review.', application.tracking_id)

        return Response({
            'message': 'Face verification successful. Your application has been submitted for Police Staff review.',
            'confidence': confidence,
            'liveness_score': liveness,
            'status': application.status,
        })


# ─── Citizen — Payment ────────────────────────────────────────────────────────

class ProcessPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            application = Application.objects.get(pk=pk, applicant=request.user)
            challan     = Challan.objects.get(application=application)
        except (Application.DoesNotExist, Challan.DoesNotExist):
            return Response({'error': 'Application/Challan not found'}, status=404)

        payment_method = request.data.get('payment_method')
        if not payment_method:
            return Response({'error': 'Payment method is required.'}, status=400)

        mobile_number = request.data.get('mobile_number', '')

        # Create Payment record
        payment = Payment.objects.create(
            application=application,
            challan=challan,
            amount=challan.amount,
            payment_method=payment_method,
            mobile_number=mobile_number
        )

        challan.status         = 'PAID'
        challan.paid_at        = timezone.now()
        challan.payment_method = payment_method
        challan.save()

        application.status = 'PAYMENT_SUBMITTED'
        application.save()

        BlockchainService.add_block(
            'PAYMENT_SUBMIT', str(application.id), request.user.cnic,
            {'transaction_id': payment.transaction_id, 'payment_method': payment_method,
             'amount': str(challan.amount), 'tracking_id': application.tracking_id},
        )
        
        # We don't notify payment confirmed yet, wait for staff verification

        return Response({'message': 'Payment submitted for verification.', 'challan_status': 'PAID',
                         'application_status': application.status, 'transaction_id': payment.transaction_id})


# ─── Staff — Workflow Views ───────────────────────────────────────────────────

class StaffForwardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    # ── Stage 2 Guard ────────────────────────────────────────────────────────
    # Staff can only forward AFTER completing the staff review (STAFF_REVIEWED).
    # PENDING, FACE_VERIFIED, UNDER_REVIEW etc. are explicitly rejected.
    REQUIRED_STATUS = 'STAFF_REVIEWED'

    def post(self, request, pk):
        if request.user.role not in ['POLICE_STAFF', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        # ── Idempotency: already forwarded ────────────────────────────────────
        if application.status == 'FORWARDED_TO_ADMIN':
            return Response({
                'message': 'Application has already been forwarded to admin.',
                'status': application.status,
            })

        # ── Guard: application must be in STAFF_REVIEWED ─────────────────────
        if application.status != self.REQUIRED_STATUS:
            return Response(
                {
                    'error': (
                        f'Cannot forward application in status "{application.status}". '
                        f'Application must be reviewed by Police Staff first '
                        f'(required status: {self.REQUIRED_STATUS}).'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        remarks = request.data.get('remarks', '')

        application.staff_notes = remarks
        application.staff_reviewed_by = request.user
        application.staff_reviewed_at = timezone.now()
        application.status = 'FORWARDED_TO_ADMIN'
        application.save()

        BlockchainService.add_block(
            'STAFF_FORWARD', str(application.id), request.user.cnic,
            {'remarks': remarks, 'tracking_id': application.tracking_id},
        )
        logger.info('Application %s forwarded to admin by %s.', application.tracking_id, request.user.cnic)

        return Response({'message': 'Application forwarded to admin.', 'status': application.status})


class StaffConfirmView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    # ── Stage 2 Guard ────────────────────────────────────────────────────────
    # Staff can only confirm AFTER the authority has approved.
    # These are statuses that have already passed this step — return safe response.
    ALREADY_CONFIRMED_STATUSES = [
        'STAFF_CONFIRMED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED',
        'PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED', 'COMPLETED',
    ]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_STAFF', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        # ── Idempotency: already confirmed ────────────────────────────────────
        if application.status in self.ALREADY_CONFIRMED_STATUSES:
            return Response({
                'message': 'Application has already been confirmed. Challan was previously generated.',
                'status': application.status,
            })

        # ── Guard: must be AUTHORITY_APPROVED ─────────────────────────────────
        if application.status != 'AUTHORITY_APPROVED':
            return Response(
                {
                    'error': (
                        f'Cannot confirm application in status "{application.status}". '
                        f'Application must be approved by Police Authority first '
                        f'(required status: AUTHORITY_APPROVED).'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.staff_confirmed_by = request.user
        application.staff_confirmed_at = timezone.now()
        application.status = 'STAFF_CONFIRMED'
        application.save()

        # Generate challan upon staff confirmation
        _generate_challan(application)

        BlockchainService.add_block(
            'STAFF_CONFIRM', str(application.id), request.user.cnic,
            {'tracking_id': application.tracking_id},
        )
        logger.info('Application %s confirmed by staff %s. Challan generated.', application.tracking_id, request.user.cnic)

        return Response({'message': 'Application confirmed and challan generated.', 'status': application.status})


class StaffVerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    # ── Stage 2 Guard ────────────────────────────────────────────────────────
    # Staff can only verify payment when the citizen has actually submitted it.
    # These statuses indicate the payment step has already passed.
    ALREADY_VERIFIED_STATUSES = [
        'PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED', 'COMPLETED',
    ]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_STAFF', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=404)

        # ── Idempotency: payment already verified ─────────────────────────────
        if application.status in self.ALREADY_VERIFIED_STATUSES:
            return Response({
                'message': 'Payment has already been verified for this application.',
                'status': application.status,
            })

        # ── Guard: must be PAYMENT_SUBMITTED ──────────────────────────────────
        if application.status != 'PAYMENT_SUBMITTED':
            return Response(
                {
                    'error': (
                        f'Cannot verify payment for application in status "{application.status}". '
                        f'The citizen must submit payment first (required status: PAYMENT_SUBMITTED).'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Safely access the payment record (OneToOneField raises RelatedObjectDoesNotExist)
        try:
            payment = application.payment_record
        except Exception:
            return Response({'error': 'Payment record not found. Citizen has not submitted payment yet.'}, status=404)

        payment.is_verified = True
        payment.verified_by = request.user
        payment.verified_at = timezone.now()
        payment.save()

        application.payment_verified_by = request.user
        application.payment_verified_at = timezone.now()
        application.status = 'PAYMENT_VERIFIED'
        application.save()

        BlockchainService.add_block(
            'PAYMENT_VERIFY', str(application.id), request.user.cnic,
            {'transaction_id': payment.transaction_id, 'tracking_id': application.tracking_id},
        )
        notify_payment_confirmed(application.applicant, application.tracking_id)
        logger.info('Payment verified for application %s by staff %s.', application.tracking_id, request.user.cnic)

        # ── Stage 4: Delegate certificate generation to the ONE authoritative service ──
        # CertificateService.generate_certificate is idempotent and handles
        # status transitions (PAYMENT_VERIFIED → PAYMENT_CONFIRMED → COMPLETED).
        try:
            from applications.certificate_service import CertificateService
            cert = CertificateService.generate_certificate(application)
            notify_certificate_ready(
                application.applicant, application.tracking_id, cert.certificate_number
            )
            return Response({
                'message': 'Payment verified and certificate issued successfully.',
                'status': application.status,
                'certificate_number': cert.certificate_number,
            })
        except Exception as cert_err:
            # Certificate generation failed — stay at PAYMENT_VERIFIED so
            # IssueCertificateView can retry.  Do NOT falsely mark COMPLETED.
            logger.error(
                'Certificate generation failed for %s: %s',
                application.tracking_id, str(cert_err),
            )
            return Response({
                'message': f'Payment verified successfully. Certificate generation pending: {str(cert_err)}',
                'status': application.status,
            })


# ─── Staff — Remark + Recommend (Legacy/Optional) ────────────────────────────

class StaffRemarkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    # ── Stage 2 Guard ────────────────────────────────────────────────────────
    # Staff review (remark) is only valid AFTER face verification is complete.
    # Applications that have progressed beyond STAFF_REVIEWED are idempotent.
    REVIEWABLE_STATUSES = ['FACE_VERIFIED']
    ALREADY_REVIEWED_STATUSES = [
        'STAFF_REVIEWED', 'FORWARDED_TO_ADMIN', 'AUTHORITY_APPROVED',
        'AUTHORITY_REJECTED', 'STAFF_CONFIRMED', 'PAYMENT_PENDING',
        'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED', 'COMPLETED',
    ]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_STAFF', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        # ── Idempotency: already reviewed ─────────────────────────────────────
        if application.status in self.ALREADY_REVIEWED_STATUSES:
            return Response({
                'message': f'Application has already been reviewed (current status: {application.status}).',
                'status': application.status,
            })

        # ── Guard: must be FACE_VERIFIED ──────────────────────────────────────
        if application.status not in self.REVIEWABLE_STATUSES:
            return Response(
                {
                    'error': (
                        f'Cannot review application in status "{application.status}". '
                        f'Face verification must be completed first '
                        f'(required status: FACE_VERIFIED).'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        remarks        = request.data.get('remarks', '')
        recommendation = request.data.get('recommendation', 'PENDING')  # APPROVE / REJECT / MORE_INFO

        application.staff_notes = remarks
        application.staff_reviewed_by = request.user
        application.staff_reviewed_at = timezone.now()
        application.status = 'STAFF_REVIEWED'
        application.save()

        BlockchainService.add_block(
            'STAFF_REVIEW', str(application.id), request.user.cnic,
            {'remarks': remarks, 'recommendation': recommendation,
             'tracking_id': application.tracking_id},
        )
        notify_staff_reviewed(application.applicant, application.tracking_id, remarks)
        logger.info('Application %s staff-reviewed by %s.', application.tracking_id, request.user.cnic)

        return Response({'message': 'Remark saved.', 'status': application.status,
                         'recommendation': recommendation})


# ─── Authority — Final Decision ───────────────────────────────────────────────

class AuthorityDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    # ── Stage 2 Guard ────────────────────────────────────────────────────────
    # Authority can ONLY approve or reject applications that have been forwarded
    # by Police Staff.  Any other status is an invalid transition.
    REQUIRED_STATUS = 'FORWARDED_TO_ADMIN'

    # These statuses mean a decision has already been recorded.
    ALREADY_DECIDED_STATUSES = [
        'AUTHORITY_APPROVED', 'AUTHORITY_REJECTED',
        'STAFF_CONFIRMED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED',
        'PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED', 'COMPLETED',
    ]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        decision = request.data.get('decision')   # APPROVE / REJECT
        reason   = request.data.get('reason', '')

        if decision not in ['APPROVE', 'REJECT']:
            return Response({'error': 'decision must be APPROVE or REJECT'}, status=400)

        # ── Idempotency: decision already recorded ────────────────────────────
        if application.status in self.ALREADY_DECIDED_STATUSES:
            return Response({
                'message': f'A decision has already been recorded for this application (current status: {application.status}).',
                'status': application.status,
            })

        # ── Guard: must be FORWARDED_TO_ADMIN ─────────────────────────────────
        if application.status != self.REQUIRED_STATUS:
            return Response(
                {
                    'error': (
                        f'Cannot make a decision on application in status "{application.status}". '
                        f'Application must be forwarded by Police Staff first '
                        f'(required status: {self.REQUIRED_STATUS}).'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.admin_notes = reason
        application.admin_decided_by = request.user
        application.admin_decided_at = timezone.now()

        if decision == 'APPROVE':
            application.status = 'AUTHORITY_APPROVED'
            application.save()
            BlockchainService.add_block(
                'AUTHORITY_APPROVE', str(application.id), request.user.cnic,
                {'tracking_id': application.tracking_id, 'reason': reason},
            )
            notify_authority_decision(application.applicant, application.tracking_id, True)
            logger.info('Application %s APPROVED by authority %s.', application.tracking_id, request.user.cnic)
        else:
            application.status = 'AUTHORITY_REJECTED'
            application.notes  = reason
            application.save()
            BlockchainService.add_block(
                'AUTHORITY_REJECT', str(application.id), request.user.cnic,
                {'tracking_id': application.tracking_id, 'reason': reason},
            )
            notify_authority_decision(application.applicant, application.tracking_id, False, reason)
            logger.info('Application %s REJECTED by authority %s.', application.tracking_id, request.user.cnic)

        return Response({'message': f'Application {decision}D.', 'status': application.status})



# ─── Issue Certificate (after payment verified) ────────────────────────────

class IssueCertificateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized. Only Police Staff/Authority can issue certificates.'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        # ── Stage 4 Guards ─────────────────────────────────────────────────────
        # Only allow certificate issuance/retry if payment was verified or confirmed
        if application.status not in ['PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED', 'COMPLETED']:
            return Response(
                {
                    'error': (
                        f'Cannot issue certificate for application in status "{application.status}". '
                        f'Payment must be verified first (required status: PAYMENT_VERIFIED).'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from applications.certificate_service import CertificateService
            cert = CertificateService.generate_certificate(application)
            
            notify_certificate_ready(
                application.applicant, application.tracking_id, cert.certificate_number
            )
            
            return Response({
                'message': 'Certificate issued successfully.',
                'certificate_number': cert.certificate_number,
                'status': 'COMPLETED'
            })
        except Exception as e:
            # Revert status to PAYMENT_VERIFIED if generation fails
            if application.status == 'PAYMENT_CONFIRMED':
                application.status = 'PAYMENT_VERIFIED'
                application.save()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ─── Analytics ────────────────────────────────────────────────────────────────


class AuthorityAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['POLICE_AUTHORITY', 'POLICE_STAFF', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)

        total     = Application.objects.count()
        completed = Application.objects.filter(status='COMPLETED').count()
        rejected  = Application.objects.filter(status='AUTHORITY_REJECTED').count()
        pending   = Application.objects.filter(status__in=['PENDING','CRIMINAL_CHECKED','STAFF_REVIEWED']).count()
        revenue   = Challan.objects.filter(status='PAID').aggregate(t=Sum('amount'))['t'] or 0
        rate      = round((completed / (completed + rejected) * 100) if (completed + rejected) > 0 else 100.0, 1)

        monthly   = Application.objects.extra(
            select={'month': "strftime('%m', submitted_at)"}
        ).values('month').annotate(count=Count('id')).order_by('month')
        month_map = {'01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun',
                     '07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec'}
        trends    = [{'name': month_map.get(m['month'], m['month']), 'applications': m['count']}
                     for m in monthly] or [{'name':'Aug','applications': total or 1}]

        districts = Application.objects.values('applicant__district').annotate(
            count=Count('id')).order_by('-count')

        return Response({
            'total_applications': total,
            'completed_applications': completed,
            'rejected_applications': rejected,
            'pending_applications': pending,
            'total_revenue': float(revenue),
            'success_rate': rate,
            'monthly_trends': trends,
            'district_reports': [
                {'district': d['applicant__district'] or 'Unknown', 'count': d['count']}
                for d in districts
            ],
        })


# ─── Staff Management (Authority only) ────────────────────────────────────────

class StaffListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        from users.serializers import UserSerializer
        staff = User.objects.filter(role='POLICE_STAFF')
        return Response(UserSerializer(staff, many=True).data)

    def post(self, request):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        from users.serializers import UserSerializer
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Explicitly set role to POLICE_STAFF — UserSerializer has role as read_only
        # so setting it in data dict is silently ignored by the serializer
        user.role = 'POLICE_STAFF'
        user.set_password(request.data.get('password', 'Staff@1234'))
        user.save()

        # Generate a one-time OTP so the new staff officer can log in immediately
        from users.otp_service import get_otp_service
        otp_service = get_otp_service()
        otp_res = otp_service.generate_and_send(user, purpose="staff_account_activation")

        response_data = UserSerializer(user).data
        response_data['otp_code'] = otp_res.get('otp_code')  # Returned for admin to communicate to staff
        response_data['message'] = f'Staff officer created. OTP for first login: {otp_res.get("otp_code", "Check console")}'
        return Response(response_data, status=201)


class StaffDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_staff(self, pk):
        try:
            return User.objects.get(pk=pk, role='POLICE_STAFF')
        except User.DoesNotExist:
            return None

    def put(self, request, pk):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        staff = self._get_staff(pk)
        if not staff:
            return Response({'error': 'Staff not found'}, status=404)
        from users.serializers import UserSerializer
        serializer = UserSerializer(staff, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        staff = self._get_staff(pk)
        if not staff:
            return Response({'error': 'Staff not found'}, status=404)
        staff.delete()
        return Response({'message': 'Staff deleted.'})


class StaffToggleActiveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            staff = User.objects.get(pk=pk, role='POLICE_STAFF')
        except User.DoesNotExist:
            return Response({'error': 'Staff not found'}, status=404)
        staff.is_active = not staff.is_active
        staff.save()
        return Response({'is_active': staff.is_active})


class StaffResetPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            staff = User.objects.get(pk=pk, role='POLICE_STAFF')
        except User.DoesNotExist:
            return Response({'error': 'Staff not found'}, status=404)
        new_pwd = request.data.get('password', 'Staff@1234')
        staff.set_password(new_pwd)
        staff.save()
        return Response({'message': 'Password reset successfully.'})


# ─── Public Certificate Verify ────────────────────────────────────────────────

class PublicCertificateVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, certificate_number):
        try:
            cert = Certificate.objects.get(
                Q(certificate_number=certificate_number) | Q(qr_code_hash=certificate_number)
            )
        except Certificate.DoesNotExist:
            return Response({'error': 'Invalid Certificate'}, status=404)

        applicant = cert.application.applicant
        application = cert.application

        # Province/district resolution — same priority chain as serializer
        province = (
            application.applicant_province
            or getattr(applicant, 'province', None)
            or None
        )
        district = getattr(applicant, 'district', None) or None

        # Dynamic authority name based on actual province
        from applications.certificate_service import get_authority_name
        authority = get_authority_name(province) if province else 'Pakistan Police'

        # Fetch blockchain hash for this application
        from blockchain.models import BlockchainBlock
        bc_block = BlockchainBlock.objects.filter(
            record_id=str(application.id), action_type='CERTIFICATE_ISSUE'
        ).first()

        return Response({
            'valid':               cert.status == 'VALID',
            'certificate_number':  cert.certificate_number,
            'applicant_name':      applicant.full_name,
            'cnic':                applicant.cnic,
            'province':            province,
            'district':            district,
            'authority':           authority,
            'issue_date':          cert.issue_date,
            'expiry_date':         cert.validity_expiry,
            'status':              cert.status,
            'blockchain_hash':     bc_block.current_hash if bc_block else None,
            'blockchain_verified': bc_block is not None,
        })


# ─── Download Certificate PDF ─────────────────────────────────────────────────

class DownloadCertificatePDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            application = Application.objects.get(pk=pk)
            cert        = Certificate.objects.get(application=application)
        except (Application.DoesNotExist, Certificate.DoesNotExist):
            return Response({'error': 'Certificate not issued yet.'}, status=404)

        if request.user != application.applicant and request.user.role not in ['POLICE_STAFF','POLICE_AUTHORITY','SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)

        if not cert.pdf_file:
            return Response({'error': 'Certificate file not generated properly.'}, status=404)

        BlockchainService.add_block(
            'CERTIFICATE_DOWNLOAD', str(application.id), request.user.cnic,
            {'certificate_number': cert.certificate_number, 'tracking_id': application.tracking_id},
        )

        response = HttpResponse(cert.pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="PakVerify_Cert_{cert.certificate_number}.pdf"'
        return response
