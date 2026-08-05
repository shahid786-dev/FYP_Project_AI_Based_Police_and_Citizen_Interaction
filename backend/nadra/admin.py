from django.contrib import admin
from .models import NADRARecord, NADRAVerification


@admin.register(NADRARecord)
class NADRARecordAdmin(admin.ModelAdmin):
    list_display  = ('cnic', 'full_name', 'father_name', 'district', 'province', 'gender', 'is_active')
    search_fields = ('cnic', 'full_name')
    list_filter   = ('gender', 'province', 'is_active')


@admin.register(NADRAVerification)
class NADRAVerificationAdmin(admin.ModelAdmin):
    list_display  = ('application', 'result', 'similarity_score', 'checked_at')
    list_filter   = ('result',)
    readonly_fields = ('checked_at',)
