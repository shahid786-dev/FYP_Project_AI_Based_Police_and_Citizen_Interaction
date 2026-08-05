from django.contrib import admin
from .models import Application, Document, Challan, Certificate

class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('tracking_id', 'applicant', 'application_type', 'status', 'submitted_at')
    list_filter = ('status', 'application_type')
    search_fields = ('tracking_id', 'applicant__full_name', 'applicant__cnic')
    ordering = ('-submitted_at',)
    inlines = [DocumentInline]

@admin.register(Challan)
class ChallanAdmin(admin.ModelAdmin):
    list_display = ('challan_number', 'application', 'amount', 'status', 'paid_at')
    list_filter = ('status',)

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_number', 'application', 'issue_date', 'status')
    list_filter = ('status',)
    search_fields = ('certificate_number', 'application__applicant__full_name')
