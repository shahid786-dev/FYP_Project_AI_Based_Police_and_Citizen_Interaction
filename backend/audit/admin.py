from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'method', 'endpoint', 'status_code', 'ip_address')
    list_filter = ('method', 'status_code')
    search_fields = ('user__full_name', 'endpoint', 'ip_address')
    readonly_fields = ('timestamp',)
