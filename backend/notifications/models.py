from django.db import models
from django.conf import settings


class Notification(models.Model):
    NOTIF_TYPES = (
        ('APPLICATION_SUBMITTED', 'Application Submitted'),
        ('AI_VERIFIED',           'AI Verification Complete'),
        ('NADRA_VERIFIED',        'NADRA Verification Complete'),
        ('CRIMINAL_CHECKED',      'Criminal Record Check Complete'),
        ('STAFF_REVIEWED',        'Staff Review Complete'),
        ('AUTHORITY_APPROVED',    'Authority Approved'),
        ('AUTHORITY_REJECTED',    'Authority Rejected'),
        ('CHALLAN_GENERATED',     'Challan Generated'),
        ('PAYMENT_CONFIRMED',     'Payment Confirmed'),
        ('CERTIFICATE_READY',     'Certificate Ready for Download'),
        ('GENERAL',               'General Notification'),
    )

    recipient   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notif_type  = models.CharField(max_length=40, choices=NOTIF_TYPES, default='GENERAL')
    title       = models.CharField(max_length=200)
    message     = models.TextField()
    is_read     = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    # Optional reference to the related application tracking ID
    reference_id = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        return f"[{self.notif_type}] → {self.recipient.full_name}: {self.title}"
