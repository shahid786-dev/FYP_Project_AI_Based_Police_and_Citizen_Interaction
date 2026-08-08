from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Count, Sum
import requests, datetime, io, uuid, qrcode

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch

from .models import Application, Document, Challan, Certificate
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
        if user.role in ['POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Application.objects.all().order_by('-submitted_at')
        return Application.objects.filter(applicant=user).order_by('-submitted_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save(applicant=request.user)

        BlockchainService.add_block(
            'APPLICATION_SUBMIT', str(application.id), request.user.cnic,
            {'tracking_id': application.tracking_id,
             'application_type': application.application_type,
             'purpose': application.purpose},
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
        from nadra.service import perform_nadra_check
        from criminals.service import perform_criminal_check

        try:
            application = Application.objects.get(pk=pk, applicant=request.user)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=404)

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
            # Auto NADRA check
            nadra_result = perform_nadra_check(application)
            application.status = 'CRIMINAL_CHECKED'
            application.save()
            BlockchainService.add_block(
                'NADRA_VERIFY', str(application.id), request.user.cnic,
                {'result': nadra_result.result, 'score': nadra_result.similarity_score,
                 'tracking_id': application.tracking_id},
            )
            notify_nadra_verified(request.user, application.tracking_id, nadra_result.result)

            # Auto criminal check
            criminal_result = perform_criminal_check(application)
            BlockchainService.add_block(
                'CRIMINAL_CHECK', str(application.id), request.user.cnic,
                {'result': criminal_result.result, 'tracking_id': application.tracking_id},
            )
            notify_criminal_checked(request.user, application.tracking_id, criminal_result.result)

        return Response({
            'message': 'Verification pipeline complete.',
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

        challan.status         = 'PAID'
        challan.paid_at        = timezone.now()
        challan.payment_method = payment_method
        challan.save()

        application.status = 'PAYMENT_CONFIRMED'
        application.save()

        BlockchainService.add_block(
            'PAYMENT_CONFIRM', str(application.id), request.user.cnic,
            {'challan_number': challan.challan_number, 'payment_method': payment_method,
             'amount': str(challan.amount), 'tracking_id': application.tracking_id},
        )
        notify_payment_confirmed(request.user, application.tracking_id)

        return Response({'message': 'Payment confirmed.', 'challan_status': 'PAID',
                         'application_status': application.status})


# ─── Staff — Remark + Recommend ───────────────────────────────────────────────

class StaffRemarkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_STAFF', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        remarks        = request.data.get('remarks', '')
        recommendation = request.data.get('recommendation', 'PENDING')  # APPROVE / REJECT / MORE_INFO

        application.notes  = remarks
        application.status = 'STAFF_REVIEWED'
        application.save()

        BlockchainService.add_block(
            'STAFF_REVIEW', str(application.id), request.user.cnic,
            {'remarks': remarks, 'recommendation': recommendation,
             'tracking_id': application.tracking_id},
        )
        notify_staff_reviewed(application.applicant, application.tracking_id, remarks)

        return Response({'message': 'Remark saved.', 'status': application.status,
                         'recommendation': recommendation})


# ─── Authority — Final Decision ───────────────────────────────────────────────

class AuthorityDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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

        if decision == 'APPROVE':
            application.status = 'AUTHORITY_APPROVED'
            application.save()
            BlockchainService.add_block(
                'AUTHORITY_APPROVE', str(application.id), request.user.cnic,
                {'tracking_id': application.tracking_id, 'reason': reason},
            )
            notify_authority_decision(application.applicant, application.tracking_id, True)
            # Generate challan now
            _generate_challan(application)
        else:
            application.status = 'AUTHORITY_REJECTED'
            application.notes  = reason
            application.save()
            BlockchainService.add_block(
                'AUTHORITY_REJECT', str(application.id), request.user.cnic,
                {'tracking_id': application.tracking_id, 'reason': reason},
            )
            notify_authority_decision(application.applicant, application.tracking_id, False, reason)

        return Response({'message': f'Application {decision}D.', 'status': application.status})


# ─── Authority — Issue Certificate (after payment) ────────────────────────────

class IssueCertificateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        if application.status != 'PAYMENT_CONFIRMED':
            return Response({'error': 'Payment must be confirmed first.'}, status=400)

        if hasattr(application, 'certificate'):
            return Response({'error': 'Certificate already issued.'}, status=400)

        try:
            from applications.certificate_service import CertificateService
            cert = CertificateService.generate_certificate(application)
            
            notify_certificate_ready(
                application.applicant, application.tracking_id, cert.certificate_number
            )
            
            return Response({'message': 'Certificate issued.', 'certificate_number': cert.certificate_number,
                             'status': 'COMPLETED'})
        except Exception as e:
            return Response({'error': str(e)}, status=400)


# ─── Police Review (legacy compat — staff can still do quick approve) ─────────

class PoliceReviewApplicationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        review_status = request.data.get('status')
        notes         = request.data.get('notes', '')
        if review_status not in ['APPROVED', 'REJECTED']:
            return Response({'error': 'Invalid status.'}, status=400)

        application.notes = notes

        if review_status == 'APPROVED':
            application.status = 'AUTHORITY_APPROVED'
            application.save()
            BlockchainService.add_block(
                'AUTHORITY_APPROVE', str(application.id), request.user.cnic,
                {'tracking_id': application.tracking_id},
            )
            notify_authority_decision(application.applicant, application.tracking_id, True)
            _generate_challan(application)
        else:
            application.status = 'AUTHORITY_REJECTED'
            application.save()
            BlockchainService.add_block(
                'AUTHORITY_REJECT', str(application.id), request.user.cnic,
                {'tracking_id': application.tracking_id, 'reason': notes},
            )
            notify_authority_decision(application.applicant, application.tracking_id, False, notes)

        return Response({'message': f'Application {review_status.lower()}.', 'status': application.status})


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
        data = request.data.copy()
        data['role'] = 'POLICE_STAFF'
        serializer = UserSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.set_password(request.data.get('password', 'Staff@1234'))
        user.save()
        return Response(UserSerializer(user).data, status=201)


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
            cert = Certificate.objects.get(certificate_number=certificate_number)
        except Certificate.DoesNotExist:
            return Response({'error': 'Invalid Certificate'}, status=404)

        # Fetch blockchain hash for this application
        from blockchain.models import BlockchainBlock
        bc_block = BlockchainBlock.objects.filter(
            record_id=str(cert.application.id), action_type='CERTIFICATE_ISSUE'
        ).first()

        return Response({
            'valid':              cert.status == 'VALID',
            'certificate_number': cert.certificate_number,
            'applicant_name':     cert.application.applicant.full_name,
            'cnic':               cert.application.applicant.cnic,
            'issue_date':         cert.issue_date,
            'expiry_date':        cert.validity_expiry,
            'status':             cert.status,
            'blockchain_hash':    bc_block.current_hash if bc_block else None,
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
