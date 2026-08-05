import hashlib
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    status_code = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Blockchain Audit Ledger Hash Fields
    block_index = models.BigIntegerField(default=0, editable=False)
    previous_hash = models.CharField(max_length=64, default='0' * 64)
    block_hash = models.CharField(max_length=64, blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']

    def save(self, *args, **kwargs):
        if not self.pk:
            last_block = AuditLog.objects.order_by('-id').first()
            if last_block and last_block.block_hash:
                self.block_index = last_block.block_index + 1
                self.previous_hash = last_block.block_hash
            else:
                self.block_index = 1
                self.previous_hash = '0' * 64

            user_identifier = str(self.user_id) if self.user_id else 'Anonymous'
            raw_data = f"{self.block_index}{self.previous_hash}{self.action}{self.endpoint}{self.ip_address}{user_identifier}"
            self.block_hash = hashlib.sha256(raw_data.encode('utf-8')).hexdigest()
            
        super().save(*args, **kwargs)

    def __str__(self):
        user_str = self.user.full_name if self.user else 'Anonymous'
        return f"[Block #{self.block_index}] {user_str} - {self.action} (Hash: {self.block_hash[:8]}...)"

