from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.contrib.auth import get_user_model

from .models import EmergencySOS, Complaint, IncidentEvidence
from .serializers import EmergencySOSSerializer, ComplaintSerializer, IncidentEvidenceSerializer
from applications.models import Application
from audit.models import AuditLog
from notifications.models import Notification

User = get_user_model()

# Helper for Audit Logging
def log_audit(user, action, description, ip_address='127.0.0.1'):
    try:
        AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            action=action,
            description=description,
            ip_address=ip_address
        )
    except Exception as e:
        print(f"Audit log failed: {e}")

# Helper for In-App Notifications
def create_notification(user, title, message, link=''):
    try:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            link=link
        )
    except Exception as e:
        print(f"Notification failed: {e}")


class EmergencySOSCreateView(generics.CreateAPIView):
    serializer_class = EmergencySOSSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        sos = serializer.save(citizen=user)
        log_audit(user, 'EMERGENCY_SOS_TRIGGERED', f'Emergency SOS alert triggered: {sos.sos_id} ({sos.emergency_type})')
        
        # Notify all Police Staff & Authority users
        police_users = User.objects.filter(role__in=['POLICE_STAFF', 'POLICE_AUTHORITY'])
        for officer in police_users:
            create_notification(
                officer,
                f"🚨 EMERGENCY SOS ALERT ({sos.sos_id})",
                f"New {sos.get_emergency_type_display()} alert near {sos.location_address[:50]}.",
                "/authority/dashboard"
            )

class EmergencySOSListView(generics.ListAPIView):
    serializer_class = EmergencySOSSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return EmergencySOS.objects.all().order_by('-created_at')
        return EmergencySOS.objects.filter(citizen=user).order_by('-created_at')

class EmergencySOSUpdateView(generics.UpdateAPIView):
    queryset = EmergencySOS.objects.all()
    serializer_class = EmergencySOSSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Only authorized police personnel can update SOS status.'}, status=status.HTTP_403_FORBIDDEN)
        
        instance = self.get_object()
        old_status = instance.status
        response = super().update(request, *args, **kwargs)
        instance.refresh_from_db()
        
        log_audit(request.user, 'SOS_STATUS_UPDATE', f'Officer {request.user.full_name} updated {instance.sos_id} status from {old_status} to {instance.status}')
        
        if instance.citizen:
            create_notification(
                instance.citizen,
                f"SOS Alert Status Update ({instance.sos_id})",
                f"Your SOS alert status is now: {instance.get_status_display()}.",
                "/citizen/dashboard"
            )
            
        return response

class ComplaintListCreateView(generics.ListCreateAPIView):
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Complaint.objects.none()
        if user.role in ['POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN']:
            category = self.request.query_params.get('category')
            qs = Complaint.objects.all().order_by('-created_at')
            if category:
                qs = qs.filter(category=category)
            return qs
        return Complaint.objects.filter(citizen=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        complaint = serializer.save(citizen=user)
        log_audit(user, 'COMPLAINT_SUBMITTED', f'Complaint submitted: {complaint.complaint_id} ({complaint.category})')
        if user:
            create_notification(
                user,
                "Complaint Registered Successfully",
                f"Your complaint ({complaint.complaint_id}) has been submitted for review.",
                "/citizen/dashboard"
            )

class ComplaintDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        # Citizens can only update if ownership matched and status is SUBMITTED
        if user.role == 'CITIZEN' and instance.citizen != user:
            return Response({'error': 'Unauthorized access.'}, status=status.HTTP_403_FORBIDDEN)

        old_status = instance.status
        response = super().update(request, *args, **kwargs)
        instance.refresh_from_db()

        if old_status != instance.status:
            log_audit(user, 'COMPLAINT_STATUS_UPDATE', f'Status of {instance.complaint_id} changed from {old_status} to {instance.status} by {user.full_name}')
            create_notification(
                instance.citizen,
                f"Complaint Status Updated ({instance.complaint_id})",
                f"Your complaint status has changed to: {instance.get_status_display()}.",
                "/citizen/dashboard"
            )

        return response

class ComplaintAssignOfficerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Only Police Authority officers can assign cases.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            complaint = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        officer_id = request.data.get('officer_id')
        try:
            officer = User.objects.get(pk=officer_id, role__in=['POLICE_STAFF', 'POLICE_AUTHORITY'])
        except User.DoesNotExist:
            return Response({'error': 'Selected Police Officer not found.'}, status=status.HTTP_400_BAD_REQUEST)
            
        complaint.assigned_officer = officer
        complaint.status = 'ASSIGNED'
        complaint.save()

        log_audit(request.user, 'COMPLAINT_ASSIGNED', f'Complaint {complaint.complaint_id} assigned to Officer {officer.full_name}')
        create_notification(
            officer,
            f"New Case Assigned ({complaint.complaint_id})",
            f"You have been assigned to investigate case: {complaint.title}.",
            "/staff/dashboard"
        )
        create_notification(
            complaint.citizen,
            f"Officer Assigned to Complaint ({complaint.complaint_id})",
            f"Officer {officer.full_name} has been assigned to your case.",
            "/citizen/dashboard"
        )

        return Response({'message': f'Case assigned successfully to Officer {officer.full_name}.'}, status=status.HTTP_200_OK)

class IncidentEvidenceUploadView(generics.CreateAPIView):
    serializer_class = IncidentEvidenceSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(uploaded_by=user)

class UnifiedTrackView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, track_id):
        track_id = track_id.strip()

        # 1. Search in Police Verification Applications
        app = Application.objects.filter(tracking_id__iexact=track_id).first()
        if app:
            cert_num = None
            if hasattr(app, 'certificate') and app.certificate:
                cert_num = app.certificate.certificate_number

            return Response({
                'type': 'VERIFICATION',
                'id': app.tracking_id,
                'title': f"Police Verification ({app.application_type})",
                'applicant_name': app.applicant.full_name,
                'status': app.status,
                'submitted_at': app.submitted_at,
                'updated_at': app.updated_at,
                'details': app.purpose,
                'certificate_number': cert_num,
                'timeline': [
                    {'title': 'Application Submitted', 'completed': True, 'date': app.submitted_at},
                    {'title': 'Face & Document AI Check', 'completed': app.status not in ['PENDING'], 'date': None},
                    {'title': 'Police Staff Review', 'completed': app.status in ['STAFF_REVIEWED', 'AUTHORITY_APPROVED', 'APPROVED', 'COMPLETED'], 'date': None},
                    {'title': 'Authority Final Decision', 'completed': app.status in ['AUTHORITY_APPROVED', 'APPROVED', 'COMPLETED'], 'date': None},
                    {'title': 'Certificate Issued', 'completed': app.status in ['APPROVED', 'COMPLETED'], 'date': None},
                ]
            }, status=status.HTTP_200_OK)

        # 2. Search in Complaints
        complaint = Complaint.objects.filter(complaint_id__iexact=track_id).first()
        if complaint:
            return Response({
                'type': 'COMPLAINT',
                'id': complaint.complaint_id,
                'title': f"{complaint.get_category_display()} - {complaint.title}",
                'applicant_name': complaint.citizen.full_name,
                'status': complaint.status,
                'priority': complaint.priority,
                'assigned_officer': complaint.assigned_officer.full_name if complaint.assigned_officer else 'Pending Assignment',
                'submitted_at': complaint.created_at,
                'updated_at': complaint.updated_at,
                'details': complaint.description,
                'timeline': [
                    {'title': 'Complaint Submitted', 'completed': True, 'date': complaint.created_at},
                    {'title': 'Under Review by Authority', 'completed': complaint.status not in ['SUBMITTED'], 'date': None},
                    {'title': 'Officer Assigned', 'completed': complaint.status in ['ASSIGNED', 'INVESTIGATION', 'RESOLVED', 'REJECTED'], 'date': None},
                    {'title': 'Investigation in Progress', 'completed': complaint.status in ['INVESTIGATION', 'RESOLVED', 'REJECTED'], 'date': None},
                    {'title': 'Case Resolved / Decision', 'completed': complaint.status in ['RESOLVED', 'REJECTED'], 'date': None},
                ]
            }, status=status.HTTP_200_OK)

        # 3. Search in Emergency SOS
        sos = EmergencySOS.objects.filter(sos_id__iexact=track_id).first()
        if sos:
            return Response({
                'type': 'EMERGENCY_SOS',
                'id': sos.sos_id,
                'title': f"Emergency SOS - {sos.get_emergency_type_display()}",
                'applicant_name': sos.citizen.full_name if sos.citizen else 'Anonymous Citizen',
                'status': sos.status,
                'submitted_at': sos.created_at,
                'updated_at': sos.updated_at,
                'details': sos.location_address,
                'timeline': [
                    {'title': 'SOS Alert Received', 'completed': True, 'date': sos.created_at},
                    {'title': 'Acknowledged by Control Room', 'completed': sos.status not in ['RECEIVED'], 'date': None},
                    {'title': 'Response Unit Dispatched', 'completed': sos.status in ['DISPATCHED', 'RESOLVED', 'CLOSED'], 'date': None},
                    {'title': 'Emergency Resolved', 'completed': sos.status in ['RESOLVED', 'CLOSED'], 'date': None},
                ]
            }, status=status.HTTP_200_OK)

        return Response({'error': f'No application, complaint, or SOS record found matching ID "{track_id}".'}, status=status.HTTP_404_NOT_FOUND)
