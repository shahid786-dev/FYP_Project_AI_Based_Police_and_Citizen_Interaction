from django.db import models


class CriminalRecord(models.Model):
    STATUS_CHOICES = (
        ('CLEAN',          'Clean / No Record'),
        ('SUSPECTED',      'Under Suspicion'),
        ('CRIMINAL_MATCH', 'Criminal Match'),
    )
    SEVERITY_CHOICES = (
        ('NONE',    'No Record'),
        ('MINOR',   'Minor Offence'),
        ('SERIOUS', 'Serious Offence'),
        ('WANTED',  'Wanted / Fugitive'),
    )

    cnic             = models.CharField(max_length=15, unique=True, db_index=True)
    name             = models.CharField(max_length=100)
    mugshot          = models.ImageField(upload_to='criminal_mugshots/', blank=True, null=True)

    # FIR details
    fir_number       = models.CharField(max_length=50, blank=True, null=True)
    crime_type       = models.CharField(max_length=150, blank=True, null=True)
    police_station   = models.CharField(max_length=100, blank=True, null=True)

    # Enhanced fields
    crime_severity   = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='NONE')
    is_wanted        = models.BooleanField(default=False)
    is_blacklisted   = models.BooleanField(default=False)
    arrest_date      = models.DateField(null=True, blank=True)
    release_date     = models.DateField(null=True, blank=True)
    previous_records = models.TextField(blank=True, help_text='JSON list of past FIR numbers')

    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CLEAN')
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.cnic}) — {self.status}"


class CriminalCheckResult(models.Model):
    """Stores the auto-check result for a specific application."""
    RESULT_CHOICES = (
        ('CLEAN',          'No Criminal Record'),
        ('MINOR_RECORD',   'Minor Record Found'),
        ('SERIOUS_RECORD', 'Serious Criminal Record'),
        ('WANTED',         'Wanted Person'),
        ('PENDING',        'Pending Check'),
    )

    application     = models.OneToOneField(
        'applications.Application',
        on_delete=models.CASCADE,
        related_name='criminal_check',
    )
    result          = models.CharField(max_length=20, choices=RESULT_CHOICES, default='PENDING')
    matched_record  = models.ForeignKey(
        CriminalRecord, null=True, blank=True, on_delete=models.SET_NULL
    )
    report_summary  = models.TextField()
    checked_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Criminal Check [{self.result}] for {self.application.tracking_id}"
