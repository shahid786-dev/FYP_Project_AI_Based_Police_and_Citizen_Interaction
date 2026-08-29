from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import random

User = get_user_model()

class EmergencySOS(models.Model):
    EMERGENCY_TYPES = (
        ('CRIME_IN_PROGRESS', 'Crime in Progress'),
        ('MEDICAL_EMERGENCY', 'Medical Emergency'),
        ('ROAD_ACCIDENT', 'Road Accident'),
        ('HARASSMENT', 'Harassment / Women Safety'),
        ('SNATCHING_ROBBERY', 'Snatching / Robbery'),
        ('FIRE_SAFETY', 'Fire Emergency'),
        ('OTHER', 'Other Urgent Emergency'),
    )

    STATUS_CHOICES = (
        ('RECEIVED', 'Received'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('DISPATCHED', 'Unit Dispatched'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    )

    sos_id = models.CharField(max_length=30, unique=True, editable=False)
    citizen = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sos_alerts')
    emergency_type = models.CharField(max_length=30, choices=EMERGENCY_TYPES, default='OTHER')
    
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    location_address = models.TextField()
    description = models.TextField(blank=True, null=True)
    contact_number = models.CharField(max_length=20)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RECEIVED')
    assigned_officer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_sos')
    police_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.sos_id:
            year = timezone.now().year
            rand_num = random.randint(100000, 999999)
            self.sos_id = f"SOS-{year}-{rand_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sos_id} - {self.get_emergency_type_display()} ({self.status})"

class Complaint(models.Model):
    CATEGORY_CHOICES = (
        ('SNATCHING', 'Mobile / Theft Snatching'),
        ('HARASSMENT', 'Women Safety / Harassment'),
        ('ACCIDENT', 'Road Accident Assistance'),
        ('THEFT', 'Property / Vehicle Theft'),
        ('ROBBERY', 'Armed Robbery'),
        ('OTHER', 'General Citizen Complaint'),
    )

    PRIORITY_CHOICES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    )

    STATUS_CHOICES = (
        ('SUBMITTED', 'Submitted'),
        ('UNDER_REVIEW', 'Under Review'),
        ('ASSIGNED', 'Assigned to Officer'),
        ('INVESTIGATION', 'Under Investigation'),
        ('RESOLVED', 'Resolved'),
        ('REJECTED', 'Rejected'),
    )

    complaint_id = models.CharField(max_length=30, unique=True, editable=False)
    citizen = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    incident_date = models.DateField(default=timezone.now)
    incident_time = models.TimeField(blank=True, null=True)
    location_address = models.TextField()
    district = models.CharField(max_length=100, blank=True, null=True)
    nearest_station = models.CharField(max_length=100, blank=True, null=True)
    
    priority = models.CharField(max_length=15, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUBMITTED')
    assigned_officer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_complaints')
    
    # Category-specific details
    suspect_details = models.TextField(blank=True, null=True)
    stolen_items_value = models.CharField(max_length=150, blank=True, null=True)
    witness_info = models.TextField(blank=True, null=True)
    is_helper_witness = models.BooleanField(default=False)
    
    resolution_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.complaint_id:
            year = timezone.now().year
            rand_num = random.randint(100000, 999999)
            self.complaint_id = f"CMP-{year}-{rand_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.complaint_id} - {self.title} ({self.status})"

class IncidentEvidence(models.Model):
    FILE_TYPES = (
        ('IMAGE', 'Photo Evidence'),
        ('VIDEO', 'Video Clip'),
        ('DOCUMENT', 'PDF / Document'),
    )

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, null=True, blank=True, related_name='evidence')
    sos = models.ForeignKey(EmergencySOS, on_delete=models.CASCADE, null=True, blank=True, related_name='evidence')
    file = models.FileField(upload_to='incident_evidence/')
    file_type = models.CharField(max_length=15, choices=FILE_TYPES, default='IMAGE')
    description = models.CharField(max_length=255, blank=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        ref = self.complaint.complaint_id if self.complaint else (self.sos.sos_id if self.sos else 'Unassigned')
        return f"Evidence for {ref}"
