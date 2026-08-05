from django.db import models


class NADRARecord(models.Model):
    """
    Simulated NADRA citizen identity database.
    Each record holds verified biometric metadata.
    """
    GENDER_CHOICES = (('M', 'Male'), ('F', 'Female'))

    cnic          = models.CharField(max_length=15, unique=True, db_index=True)
    full_name     = models.CharField(max_length=100)
    father_name   = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender        = models.CharField(max_length=1, choices=GENDER_CHOICES)
    address       = models.TextField()
    district      = models.CharField(max_length=100, blank=True)
    province      = models.CharField(max_length=100, blank=True)
    # In a real system this would be a biometric vector; here we store an image
    face_image    = models.ImageField(upload_to='nadra_faces/', blank=True, null=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.cnic})"


class NADRAVerification(models.Model):
    """
    Stores the result of a NADRA identity check for a given application.
    Linked 1-to-1 with Application.
    """
    RESULT_CHOICES = (
        ('MATCHED',      'Identity Matched'),
        ('NOT_MATCHED',  'Identity Not Matched'),
        ('NOT_FOUND',    'CNIC Not Found in NADRA'),
        ('PENDING',      'Pending Verification'),
    )

    # Use string reference to avoid circular imports
    application      = models.OneToOneField(
        'applications.Application',
        on_delete=models.CASCADE,
        related_name='nadra_verification',
    )
    nadra_record     = models.ForeignKey(
        NADRARecord, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='verifications',
    )
    result           = models.CharField(max_length=20, choices=RESULT_CHOICES, default='PENDING')
    similarity_score = models.FloatField(default=0.0)   # 0-100 %
    checked_at       = models.DateTimeField(auto_now_add=True)
    notes            = models.TextField(blank=True)

    def __str__(self):
        return f"NADRA Check [{self.result}] for {self.application.tracking_id}"
