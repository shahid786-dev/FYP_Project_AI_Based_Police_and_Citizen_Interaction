from django.contrib import admin
from .models import CriminalRecord

@admin.register(CriminalRecord)
class CriminalRecordAdmin(admin.ModelAdmin):
    list_display = ('cnic', 'name', 'crime_type', 'status', 'police_station')
    list_filter = ('status',)
    search_fields = ('cnic', 'name', 'fir_number')
