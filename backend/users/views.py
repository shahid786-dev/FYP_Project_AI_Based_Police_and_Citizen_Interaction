from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from rest_framework_simplejwt.tokens import RefreshToken
import random
import datetime

from .serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer, OtpVerificationSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)


User = get_user_model()

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    # Add custom claims
    refresh['role'] = user.role
    refresh['full_name'] = user.full_name
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'role': user.role,
        'full_name': user.full_name,
        'cnic': user.cnic
    }

class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Simulate SMS OTP printout
        print(f"\n==================================================")
        print(f"SMS GATEWAY: Registration OTP for CNIC {user.cnic} is: {user.otp_code}")
        print(f"==================================================\n")
        
        return Response({
            'message': 'Citizen registered successfully. OTP sent for verification.',
            'cnic': user.cnic,
            'otp_code': user.otp_code # Return OTP code in dev response for ease of front-end prototype testing
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        cnic_or_email = serializer.validated_data['cnic']
        password = serializer.validated_data['password']
        
        # Support login by email or CNIC
        try:
            user = User.objects.get(Q(cnic=cnic_or_email) | Q(email=cnic_or_email))
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Check lockout
        if user.check_lockout():
            return Response({
                'error': f'Account locked due to too many failed attempts. Try again later.'
            }, status=status.HTTP_403_FORBIDDEN)
            
        if not user.check_password(password):
            user.increment_failed_attempts()
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Success: reset failed attempts, generate OTP
        user.failed_login_attempts = 0
        user.otp_code = str(random.randint(100000, 999999))
        user.otp_expiry = timezone.now() + timezone.timedelta(minutes=10)
        user.save()
        
        # Simulate SMS gateway
        print(f"\n==================================================")
        print(f"SMS GATEWAY: Login OTP for CNIC {user.cnic} is: {user.otp_code}")
        print(f"==================================================\n")
        
        return Response({
            'message': 'OTP code sent to your registered mobile number.',
            'cnic': user.cnic,
            'otp_code': user.otp_code # Return OTP in response for prototype simulation
        }, status=status.HTTP_200_OK)

class VerifyOtpView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OtpVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        cnic = serializer.validated_data['cnic']
        otp_code = serializer.validated_data['otp_code']
        
        try:
            user = User.objects.get(cnic=cnic)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Validate OTP
        if user.otp_code != otp_code or (user.otp_expiry and timezone.now() > user.otp_expiry):
            # Fallback bypass: allow 123456 as bypass for local convenience testing
            if otp_code != '123456':
                return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Reset OTP and issue tokens
        user.otp_code = None
        user.otp_expiry = None
        user.save()
        
        tokens = get_tokens_for_user(user)
        return Response(tokens, status=status.HTTP_200_OK)

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        cnic = serializer.validated_data['cnic']
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(Q(cnic=cnic) & Q(email=email))
        except User.DoesNotExist:
            return Response({'error': 'No matching registered Citizen found with given CNIC and Email.'}, status=status.HTTP_404_NOT_FOUND)
            
        otp_code = str(random.randint(100000, 999999))
        user.otp_code = otp_code
        user.otp_expiry = timezone.now() + timezone.timedelta(minutes=10)
        user.save()
        
        print(f"\n==================================================")
        print(f"PASSWORD RESET OTP for Citizen {user.full_name} ({user.cnic}): {otp_code}")
        print(f"==================================================\n")
        
        return Response({
            'message': 'Password reset OTP sent to your registered contact channel.',
            'cnic': user.cnic,
            'otp_code': otp_code # Included for prototype demo testing
        }, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        cnic = serializer.validated_data['cnic']
        otp_code = serializer.validated_data['otp_code']
        new_password = serializer.validated_data['new_password']
        
        try:
            user = User.objects.get(cnic=cnic)
        except User.DoesNotExist:
            return Response({'error': 'Citizen record not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        if user.otp_code != otp_code or (user.otp_expiry and timezone.now() > user.otp_expiry):
            if otp_code != '123456':
                return Response({'error': 'Invalid or expired OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
                
        user.set_password(new_password)
        user.failed_login_attempts = 0
        user.is_locked = False
        user.lock_time = None
        user.otp_code = None
        user.otp_expiry = None
        user.save()
        
        return Response({
            'message': 'Password reset successful! You can now log in with your new password.'
        }, status=status.HTTP_200_OK)

# Alias for backwards compatibility
PasswordResetView = PasswordResetRequestView


# Super Admin Views to manage Citizens & Staff
class AdminUserListView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only admins can view all users
        if self.request.user.role != 'SUPER_ADMIN':
            return User.objects.none()
            
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset

    def perform_create(self, serializer):
        # Allow admin to create staff/authority accounts
        password = self.request.data.get('password', 'Pass123')
        user = serializer.save()
        user.set_password(password)
        user.save()

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.user.role != 'SUPER_ADMIN':
            self.permission_denied(request, message="Only Super Admins can manage users.")
