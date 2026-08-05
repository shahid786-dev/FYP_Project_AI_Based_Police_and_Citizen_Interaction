from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('cnic', 'full_name', 'email', 'role', 'is_locked', 'date_joined')
    list_filter = ('role', 'is_locked', 'is_active')
    search_fields = ('cnic', 'full_name', 'email')
    ordering = ('-date_joined',)
    fieldsets = (
        (None, {'fields': ('cnic', 'email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'father_name', 'dob', 'gender', 'mobile_number', 'province', 'district', 'address')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'is_locked')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('cnic', 'email', 'full_name', 'role', 'password1', 'password2'),
        }),
    )
