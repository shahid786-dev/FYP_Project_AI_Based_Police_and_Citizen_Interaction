from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
import random

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'cnic', 'full_name', 'father_name', 'dob', 'gender',
            'mobile_number', 'email', 'province', 'district', 'address', 'role'
        )
        read_only_fields = ('id', 'role')

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = (
            'cnic', 'full_name', 'father_name', 'dob', 'gender',
            'mobile_number', 'email', 'province', 'district', 'address', 'password'
        )

    def validate_cnic(self, value):
        clean_cnic = value.replace('-', '')
        if len(clean_cnic) != 13 or not clean_cnic.isdigit():
            raise serializers.ValidationError("CNIC must be 13 digits long.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['role'] = 'CITIZEN' # Enforce Citizen Role on registration
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        # Generate initial OTP
        user.otp_code = str(random.randint(100000, 999999))
        user.otp_expiry = timezone.now() + timezone.timedelta(minutes=10)
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    cnic = serializers.CharField()
    password = serializers.CharField(write_only=True)

class OtpVerificationSerializer(serializers.Serializer):
    cnic = serializers.CharField()
    otp_code = serializers.CharField(max_length=6)

class PasswordResetRequestSerializer(serializers.Serializer):
    cnic = serializers.CharField()
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    cnic = serializers.CharField()
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=6)

