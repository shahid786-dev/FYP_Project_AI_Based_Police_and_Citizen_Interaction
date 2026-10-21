import re

from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application, Certificate, Document, Payment
from criminals.models import CriminalRecord


POLICE_ROLES = {'POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN'}
CNIC_PATTERN = re.compile(r'^\d{5}-?\d{7}-?\d$')
TRACKING_PATTERN = re.compile(r'\bPKV-\d{4}-\d{6}\b', re.IGNORECASE)
CERTIFICATE_PATTERN = re.compile(r'\bCERT-\d{4}-\d{6}\b', re.IGNORECASE)
CERTIFICATE_REFERENCE_PATTERN = re.compile(
    r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',
    re.IGNORECASE,
)
APPLICATION_STATUSES = dict(Application.STATUS_CHOICES)
DOCUMENT_TYPES = dict(Document.DOC_TYPES)
APPLICATION_TYPES = [label for _, label in Application.TYPE_CHOICES]


def _application_for_user(user, identifier):
    queryset = Application.objects.select_related('applicant').prefetch_related('documents')
    if user.role == 'CITIZEN':
        queryset = queryset.filter(applicant=user)
    elif user.role == 'SUPER_ADMIN' and user.province:
        queryset = queryset.filter(
            Q(applicant_province=user.province) | Q(applicant__province=user.province)
        )

    if identifier.isdigit():
        return queryset.filter(pk=int(identifier)).first()
    return queryset.filter(tracking_id__iexact=identifier).first()


def _application_summary(application):
    document_labels = [
        DOCUMENT_TYPES.get(document.document_type, document.document_type)
        for document in application.documents.all()
    ]
    summary = [
        f"Application {application.tracking_id}",
        f"Type: {application.application_type}",
        f"Status: {APPLICATION_STATUSES.get(application.status, application.status)}",
        f"Submitted: {application.submitted_at:%Y-%m-%d}",
        "Uploaded documents: " + (', '.join(document_labels) if document_labels else 'None'),
    ]
    if application.status in {'REJECTED', 'AUTHORITY_REJECTED'} and application.notes:
        summary.append(f"Reason recorded: {application.notes}")
    if application.status in {'PENDING', 'UNDER_REVIEW', 'FACE_VERIFIED', 'CRIMINAL_CHECK'}:
        summary.append("Next step: check your portal for updates or any requested action.")
    elif application.status in {'APPROVED', 'COMPLETED'} and not hasattr(application, 'certificate'):
        summary.append("Next step: check the portal for certificate issuance or download.")
    return '\n'.join(summary)


def _certificate_for_user(user, identifier):
    queryset = Certificate.objects.select_related('application', 'application__applicant')
    if user.role == 'CITIZEN':
        queryset = queryset.filter(application__applicant=user)
    elif user.role == 'SUPER_ADMIN' and user.province:
        queryset = queryset.filter(
            Q(application__applicant_province=user.province)
            | Q(application__applicant__province=user.province)
        )
    return queryset.filter(
        Q(certificate_number__iexact=identifier) | Q(qr_code_hash__iexact=identifier)
    ).first()


def _certificate_summary(certificate):
    return (
        f"Certificate: {certificate.certificate_number}\n"
        f"Status: {certificate.get_status_display()}\n"
        f"Issue date: {certificate.issue_date:%Y-%m-%d}\n"
        f"Expiry date: {certificate.validity_expiry:%Y-%m-%d}\n"
        f"Application: {certificate.application.tracking_id}\n"
        "Download it from the Certificates section of your portal."
    )


def _faq_answer(message):
    text = message.lower()
    if any(word in text for word in ('document', 'requirement', 'upload')):
        requirements = ', '.join(DOCUMENT_TYPES.values())
        types = ', '.join(APPLICATION_TYPES)
        return (
            f"The application supports these types: {types}. "
            f"The document upload workflow accepts: {requirements}. "
            "The project does not define mandatory documents for each application type, "
            "file-size/format limits, or a processing-time estimate; check your portal "
            "for the requirements shown during submission."
        )
    if any(word in text for word in ('how to apply', 'submit', 'new application', 'apply')):
        return (
            "Sign in to the Citizen Portal, open New Request, choose one of the available "
            f"application types ({', '.join(APPLICATION_TYPES)}), complete the form, "
            "and submit it. You can then upload documents from that application's page "
            "and follow its status in the portal."
        )
    if any(word in text for word in ('payment', 'fee', 'pay', 'challan')):
        methods = ', '.join(label for _, label in Payment.PAYMENT_METHOD_CHOICES)
        return (
            f"Payment records support these methods: {methods}. Your challan amount and "
            "payment status are available in the application portal. No additional fee "
            "or payment-provider availability is asserted here."
        )
    if any(word in text for word in ('certificate', 'qr', 'verify')):
        return (
            "Issued certificates can be verified using the existing certificate verification "
            "page and QR/reference value. Citizens can download their issued certificate "
            "from their application in the portal."
        )

    return (
        "I can explain application steps, document-upload options, payment information "
        "shown by the portal, and certificate verification. For record lookups, include "
        "an application tracking ID or certificate number while signed in."
    )


class ChatbotView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_message = request.data.get('message')
        if not isinstance(user_message, str) or not user_message.strip():
            return Response(
                {'error': 'Message is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(user_message) > 1000:
            return Response(
                {'error': 'Message must be 1000 characters or fewer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = user_message.strip()
        tracking_match = TRACKING_PATTERN.search(message)
        certificate_match = (
            CERTIFICATE_PATTERN.search(message)
            or CERTIFICATE_REFERENCE_PATTERN.search(message)
        )
        if tracking_match or re.search(r'\bapplication\s+(?:id\s*)?#?\d+\b', message, re.I):
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Sign in to retrieve application information.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            identifier = (
                tracking_match.group(0) if tracking_match
                else re.search(r'\bapplication\s+(?:id\s*)?#?(\d+)\b', message, re.I).group(1)
            )
            application = _application_for_user(request.user, identifier)
            if application is None:
                return Response(
                    {'error': 'Application is unavailable or you are not authorized to view it.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response({'reply': _application_summary(application), 'source': 'application'})

        if certificate_match:
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Sign in to retrieve certificate information.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            certificate = _certificate_for_user(request.user, certificate_match.group(0))
            if certificate is None:
                return Response(
                    {'error': 'Certificate is unavailable or you are not authorized to view it.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response({'reply': _certificate_summary(certificate), 'source': 'certificate'})

        criminal_lookup = re.search(
            r'\b(criminal|background)\b'
            r'|(?:\b(?:check|search|look up|lookup)\b.*\bcnic\b)'
            r'|(?:\bcnic\b.*\b(?:check|search|look up|lookup)\b)',
            message,
            re.I,
        )
        if criminal_lookup:
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Sign in with an authorized police account to perform this lookup.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            if request.user.role not in POLICE_ROLES:
                return Response(
                    {'error': 'You are not authorized to perform criminal-record lookups.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            cnic_match = re.search(r'\b\d{5}-?\d{7}-?\d\b', message)
            if not cnic_match or not CNIC_PATTERN.fullmatch(cnic_match.group(0)):
                return Response(
                    {'error': 'Provide a CNIC in the format 12345-1234567-1.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cnic = cnic_match.group(0).replace('-', '')
            record = CriminalRecord.objects.filter(cnic__in=(cnic, cnic_match.group(0))).first()
            if record is None:
                reply = (
                    "No matching record was found in this system's locally maintained "
                    "criminal-record dataset. This is not a check against an external "
                    "government database and is not a legal finding."
                )
            else:
                reply = (
                    "A matching entry was found in this system's locally maintained "
                    f"criminal-record dataset (status: {record.get_status_display()}). "
                    "A database match is not itself a verified legal finding."
                )
            return Response({'reply': reply, 'source': 'local_criminal_records'})

        return Response({'reply': _faq_answer(message), 'source': 'project_guidance'})
