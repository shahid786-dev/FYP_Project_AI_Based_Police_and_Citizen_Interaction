from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import random
import uuid

User = get_user_model()

class Application(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('UNDER_REVIEW', 'Under Review'),
        ('FACE_VERIFIED', 'Face Verified'),
        ('CRIMINAL_CHECK', 'Criminal Check'),
        ('PAYMENT_PENDING', 'Payment Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('COMPLETED', 'Completed'),
    )

    TYPE_CHOICES = (
        ('Character Certificate', 'Character Certificate'),
        ('Tenant Verification', 'Tenant Verification'),
        ('Employee Verification', 'Employee Verification'),
        ('General Police Verification', 'General Police Verification'),
        ('Arms License Verification', 'Arms License Verification'),
        ('Passport Police Clearance', 'Passport Police Clearance'),
    )

    applicant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    application_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    purpose = models.TextField()
    current_address = models.TextField()
    nearest_station = models.CharField(max_length=100)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True, null=True)
    
    tracking_id = models.CharField(max_length=30, unique=True)
    face_confidence = models.FloatField(default=0.0)
    liveness_score = models.FloatField(default=0.0)
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            year = timezone.now().year
            rand_digits = random.randint(100000, 999999)
            self.tracking_id = f"PKV-{year}-{rand_digits}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.application_type} - {self.tracking_id} ({self.applicant.full_name})"

class Document(models.Model):
    DOC_TYPES = (
        ('CNIC_FRONT', 'CNIC Front Side'),
        ('CNIC_BACK', 'CNIC Back Side'),
        ('PASSPORT_PHOTO', 'Passport-size Photo'),
        ('SUPPORTING', 'Supporting Document'),
    )

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOC_TYPES)
    file = models.FileField(upload_to='application_docs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.document_type} for {self.application.tracking_id}"

class Challan(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('EXPIRED', 'Expired'),
    )

    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='challan')
    challan_number = models.CharField(max_length=30, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=650.00)
    due_date = models.DateField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    paid_at = models.DateTimeField(blank=True, null=True)
    payment_method = models.CharField(max_length=20, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.challan_number:
            year = timezone.now().year
            rand_digits = random.randint(100000, 999999)
            self.challan_number = f"CHN-{year}-{rand_digits}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Challan {self.challan_number} for {self.application.tracking_id}"

class Certificate(models.Model):
    STATUS_CHOICES = (
        ('VALID', 'Valid'),
        ('EXPIRED', 'Expired'),
        ('REVOKED', 'Revoked'),
    )

    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='certificate')
    certificate_number = models.CharField(max_length=30, unique=True)
    issue_date = models.DateField(auto_now_add=True)
    validity_expiry = models.DateField()
    qr_code_hash = models.CharField(max_length=100, unique=True)
    digital_signature = models.TextField()
    verification_url = models.CharField(max_length=255)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='VALID')
    pdf_file = models.FileField(upload_to='certificates/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.certificate_number:
            year = timezone.now().year
            rand_digits = random.randint(100000, 999999)
            self.certificate_number = f"CERT-{year}-{rand_digits}"
        if not self.qr_code_hash:
            self.qr_code_hash = str(uuid.uuid4())
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Certificate {self.certificate_number} for {self.application.applicant.full_name}"
