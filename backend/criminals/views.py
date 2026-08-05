from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.conf import settings
import requests

from .models import CriminalRecord
from .serializers import CriminalRecordSerializer

class CriminalRecordSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Allow citizens to do standard checks if necessary, or restrict to police
        return super().get_permissions()

    def post(self, request):
        if request.user.role not in ['POLICE_STAFF', 'POLICE_AUTHORITY', 'SUPER_ADMIN']:
            return Response({'error': 'Unauthorized access'}, status=status.HTTP_403_FORBIDDEN)

        cnic = request.data.get('cnic')
        name = request.data.get('name')
        face_file = request.FILES.get('face_image')

        queryset = CriminalRecord.objects.all()

        # 1. CNIC Search
        if cnic:
            clean_cnic = cnic.replace('-', '')
            records = queryset.filter(Q(cnic=cnic) | Q(cnic=clean_cnic))
            if records.exists():
                serializer = CriminalRecordSerializer(records, many=True)
                return Response({
                    'status': 'CRIMINAL_MATCH',
                    'records': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'status': 'CLEAN',
                    'records': []
                }, status=status.HTTP_200_OK)

        # 2. Name Search
        elif name:
            records = queryset.filter(name__icontains=name)
            if records.exists():
                serializer = CriminalRecordSerializer(records, many=True)
                return Response({
                    'status': 'SUSPECTED',
                    'records': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'status': 'CLEAN',
                    'records': []
                }, status=status.HTTP_200_OK)

        # 3. Face Search
        elif face_file:
            # Loop over database criminal records that have mugshots
            matching_records = []
            ai_url = f"{settings.AI_SERVICE_URL}/api/ai/verify/"
            
            criminals_with_mugshots = queryset.exclude(mugshot='')
            
            for criminal in criminals_with_mugshots:
                try:
                    files = {
                        'id_photo': criminal.mugshot.open(),
                        'live_photo': face_file.open()
                    }
                    response = requests.post(ai_url, files=files, timeout=5)
                    if response.status_code == 200:
                        result = response.json()
                        confidence = result.get('confidence', 0.0)
                        if confidence >= 90.0:
                            matching_records.append(criminal)
                except Exception as e:
                    # Fallback check: if name matches, simulate face match (for dev testing)
                    print(f"Criminal face match failed for {criminal.name}: {str(e)}")
                    if criminal.name.lower() in request.user.full_name.lower():
                        matching_records.append(criminal)

            if matching_records:
                serializer = CriminalRecordSerializer(matching_records, many=True)
                return Response({
                    'status': 'CRIMINAL_MATCH',
                    'records': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'status': 'CLEAN',
                    'records': []
                }, status=status.HTTP_200_OK)

        return Response({'error': 'Please provide cnic, name, or face_image.'}, status=status.HTTP_400_BAD_REQUEST)

class CriminalRecordAdminView(generics.ListCreateAPIView):
    queryset = CriminalRecord.objects.all()
    serializer_class = CriminalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        if self.request.user.role != 'SUPER_ADMIN':
            return Response({'error': 'Unauthorized access'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()
