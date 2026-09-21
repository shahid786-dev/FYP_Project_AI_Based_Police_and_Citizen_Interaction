from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import NADRARecord, NADRAVerification
from .serializers import NADRAVerificationSerializer


class NADRAVerificationStatusView(APIView):
    """
    GET /api/nadra/status/<application_pk>/
    Returns the NADRA verification result for the given application.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, application_pk):
        try:
            verification = NADRAVerification.objects.get(
                application_id=application_pk,
            )
        except NADRAVerification.DoesNotExist:
            return Response(
                {'detail': 'No NADRA verification performed for this application yet.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user.role == 'CITIZEN' and verification.application.applicant_id != request.user.id:
            return Response({'detail': 'You cannot access this application.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role not in {'CITIZEN', 'POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN'}:
            return Response({'detail': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = NADRAVerificationSerializer(verification)
        return Response(serializer.data)
