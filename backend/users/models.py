from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
import datetime

class UserManager(BaseUserManager):
    def create_user(self, cnic, email, password=None, **extra_fields):
        if not cnic:
            raise ValueError('The CNIC field must be set')
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(cnic=cnic, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, cnic, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'SUPER_ADMIN')
        return self.create_user(cnic, email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('CITIZEN', 'Citizen'),
        ('POLICE_STAFF', 'Police Staff'),
        ('POLICE_AUTHORITY', 'Police Authority'),
        ('SUPER_ADMIN', 'Super Admin'),
    )

    cnic = models.CharField(max_length=15, unique=True)
    full_name = models.CharField(max_length=100)
    father_name = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    mobile_number = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(unique=True)
    province = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CITIZEN')
    
    failed_login_attempts = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    lock_time = models.DateTimeField(blank=True, null=True)
    
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_expiry = models.DateTimeField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'cnic'
    REQUIRED_FIELDS = ['email', 'full_name']

    def __str__(self):
        return f"{self.full_name} ({self.cnic})"

    def check_lockout(self):
        if self.is_locked:
            if self.lock_time and timezone.now() > self.lock_time + datetime.timedelta(minutes=15):
                self.is_locked = False
                self.failed_login_attempts = 0
                self.lock_time = None
                self.save()
                return False
            return True
        return False

    def increment_failed_attempts(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.is_locked = True
            self.lock_time = timezone.now()
        self.save()
