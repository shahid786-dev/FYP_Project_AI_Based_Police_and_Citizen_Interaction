from django.db import models


class BlockchainBlock(models.Model):
    """
    Immutable blockchain block storing a hash-chained record of every
    critical action performed in the system.  No passwords or raw PII
    are stored – only hashes and descriptive metadata.
    """

    ACTION_TYPES = (
        ('CITIZEN_REGISTER',    'Citizen Registered'),
        ('PROFILE_UPDATE',      'Profile Updated'),
        ('APPLICATION_SUBMIT',  'Application Submitted'),
        ('DOCUMENT_UPLOAD',     'Document Uploaded'),
        ('AI_FACE_VERIFY',      'AI Face Verification'),
        ('NADRA_VERIFY',        'NADRA Verification'),
        ('CRIMINAL_CHECK',      'Criminal Record Check'),
        ('STAFF_REVIEW',        'Staff Review / Remark'),
        ('AUTHORITY_APPROVE',   'Authority Approved'),
        ('AUTHORITY_REJECT',    'Authority Rejected'),
        ('CHALLAN_GENERATE',    'Challan Generated'),
        ('PAYMENT_CONFIRM',     'Payment Confirmed'),
        ('CERTIFICATE_ISSUE',   'Certificate Issued'),
        ('CERTIFICATE_DOWNLOAD','Certificate Downloaded'),
        ('RECORD_MODIFY',       'Sensitive Record Modified'),
        ('GENESIS',             'Genesis Block'),
    )

    block_index    = models.IntegerField(db_index=True)
    timestamp      = models.DateTimeField(auto_now_add=True)
    previous_hash  = models.CharField(max_length=64)
    current_hash   = models.CharField(max_length=64, unique=True, db_index=True)
    data_hash      = models.CharField(max_length=64)   # SHA-256 of payload_json
    action_type    = models.CharField(max_length=40, choices=ACTION_TYPES)
    record_id      = models.CharField(max_length=100, blank=True)  # e.g. application pk
    performed_by   = models.CharField(max_length=100)              # CNIC or 'SYSTEM'
    nonce          = models.IntegerField(default=0)
    payload_json   = models.TextField()  # JSON – NO passwords or sensitive PII

    class Meta:
        ordering = ['block_index']
        verbose_name = 'Blockchain Block'
        verbose_name_plural = 'Blockchain Blocks'

    def __str__(self):
        return f"Block #{self.block_index} [{self.action_type}] — {self.current_hash[:16]}…"
