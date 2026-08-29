import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# ═══════════════════════════════════════════════════════════════════
# PakVerify — Admin & Staff Credentials (All Provinces)
# ═══════════════════════════════════════════════════════════════════
# Usage: python manage.py shell < create_admins.py
#        OR: python backend/create_admins.py (from project root)
#
# CREDENTIALS TABLE:
# ─────────────────────────────────────────────────────────────────
# Role             | Province          | CNIC              | Password
# ─────────────────────────────────────────────────────────────────
# SUPER_ADMIN      | Punjab            | 35202-2222222-2   | Admin@Punjab123
# SUPER_ADMIN      | Sindh             | 42101-1111111-1   | Admin@Sindh123
# SUPER_ADMIN      | KPK               | 17301-3333333-3   | Admin@KPK123
# SUPER_ADMIN      | Balochistan       | 65401-5555555-5   | Admin@Balo123
# SUPER_ADMIN      | ICT (Islamabad)   | 61101-7777777-7   | Admin@ICT123
# SUPER_ADMIN      | Gilgit-Baltistan  | 71401-4444444-4   | Admin@GB123
# SUPER_ADMIN      | AJK               | 13302-8888888-8   | Admin@AJK123
# ─────────────────────────────────────────────────────────────────
# POLICE_STAFF     | Punjab            | 35202-6666666-6   | Staff@Punjab123
# POLICE_STAFF     | Sindh             | 42101-5555555-5   | Staff@Sindh123
# POLICE_STAFF     | KPK               | 17301-9999999-9   | Staff@KPK123
# POLICE_STAFF     | Balochistan       | 65401-6666666-6   | Staff@Balo123
# POLICE_STAFF     | ICT               | 61101-2222222-2   | Staff@ICT123
# ─────────────────────────────────────────────────────────────────
# POLICE_AUTHORITY | Punjab            | 35202-7777777-7   | Auth@Punjab123
# POLICE_AUTHORITY | Sindh             | 42101-6666666-6   | Auth@Sindh123
# POLICE_AUTHORITY | KPK               | 17301-4444444-4   | Auth@KPK123
# ═══════════════════════════════════════════════════════════════════

admins_info = [
    # ─── SUPER ADMINS (Province Heads) ───────────────────────────
    {
        'cnic': '35202-2222222-2',
        'name': 'Tahir Raza',
        'province': 'Punjab',
        'role': 'SUPER_ADMIN',
        'password': 'Admin@Punjab123',
        'email': 'admin.punjab@pakverify.gov.pk',
    },
    {
        'cnic': '42101-1111111-1',
        'name': 'Shahid Ali',
        'province': 'Sindh',
        'role': 'SUPER_ADMIN',
        'password': 'Admin@Sindh123',
        'email': 'admin.sindh@pakverify.gov.pk',
    },
    {
        'cnic': '17301-3333333-3',
        'name': 'Zameer Khan',
        'province': 'KPK',
        'role': 'SUPER_ADMIN',
        'password': 'Admin@KPK123',
        'email': 'admin.kpk@pakverify.gov.pk',
    },
    {
        'cnic': '65401-5555555-5',
        'name': 'Barkat Mengal',
        'province': 'Balochistan',
        'role': 'SUPER_ADMIN',
        'password': 'Admin@Balo123',
        'email': 'admin.balochistan@pakverify.gov.pk',
    },
    {
        'cnic': '61101-7777777-7',
        'name': 'Rashid Ahmed',
        'province': 'ICT',
        'role': 'SUPER_ADMIN',
        'password': 'Admin@ICT123',
        'email': 'admin.ict@pakverify.gov.pk',
    },
    {
        'cnic': '71401-4444444-4',
        'name': 'Zulqarnain Mir',
        'province': 'Gilgit-Baltistan',
        'role': 'SUPER_ADMIN',
        'password': 'Admin@GB123',
        'email': 'admin.gb@pakverify.gov.pk',
    },
    {
        'cnic': '13302-8888888-8',
        'name': 'Sardar Aqeel Ahmed',
        'province': 'AJK',
        'role': 'SUPER_ADMIN',
        'password': 'Admin@AJK123',
        'email': 'admin.ajk@pakverify.gov.pk',
    },

    # ─── POLICE STAFF (Province Officers) ─────────────────────────
    {
        'cnic': '35202-6666666-6',
        'name': 'Inspector Usman Tariq',
        'province': 'Punjab',
        'role': 'POLICE_STAFF',
        'password': 'Staff@Punjab123',
        'email': 'staff.punjab@pakverify.gov.pk',
    },
    {
        'cnic': '42101-5555555-5',
        'name': 'Inspector Asam Khan',
        'province': 'Sindh',
        'role': 'POLICE_STAFF',
        'password': 'Staff@Sindh123',
        'email': 'staff.sindh@pakverify.gov.pk',
    },
    {
        'cnic': '17301-9999999-9',
        'name': 'Inspector Haroon Yusuf',
        'province': 'KPK',
        'role': 'POLICE_STAFF',
        'password': 'Staff@KPK123',
        'email': 'staff.kpk@pakverify.gov.pk',
    },
    {
        'cnic': '65401-6666666-6',
        'name': 'Inspector Siraj Baloch',
        'province': 'Balochistan',
        'role': 'POLICE_STAFF',
        'password': 'Staff@Balo123',
        'email': 'staff.balochistan@pakverify.gov.pk',
    },
    {
        'cnic': '61101-2222222-2',
        'name': 'Inspector Farhan Malik',
        'province': 'ICT',
        'role': 'POLICE_STAFF',
        'password': 'Staff@ICT123',
        'email': 'staff.ict@pakverify.gov.pk',
    },

    # ─── POLICE AUTHORITY (Senior Officers) ──────────────────────
    {
        'cnic': '35202-7777777-7',
        'name': 'SP Tariq Malik',
        'province': 'Punjab',
        'role': 'POLICE_AUTHORITY',
        'password': 'Auth@Punjab123',
        'email': 'authority.punjab@pakverify.gov.pk',
    },
    {
        'cnic': '42101-6666666-6',
        'name': 'SP Mian Riaz',
        'province': 'Sindh',
        'role': 'POLICE_AUTHORITY',
        'password': 'Auth@Sindh123',
        'email': 'authority.sindh@pakverify.gov.pk',
    },
    {
        'cnic': '17301-4444444-4',
        'name': 'DSP Karan Wali',
        'province': 'KPK',
        'role': 'POLICE_AUTHORITY',
        'password': 'Auth@KPK123',
        'email': 'authority.kpk@pakverify.gov.pk',
    },
]

print("\n" + "="*70)
print("  PakVerify — Creating Admin & Staff Accounts")
print("="*70)

created_count = 0
updated_count = 0

for admin in admins_info:
    user, created = User.objects.get_or_create(
        cnic=admin['cnic'],
        defaults={
            'full_name': admin['name'],
            'mobile_number': f"0300{admin['cnic'].replace('-', '')[-7:]}",
            'email': admin['email'],
            'role': admin['role'],
            'province': admin['province'],
            'is_staff': True,
            'is_superuser': admin['role'] == 'SUPER_ADMIN',
        }
    )
    user.set_password(admin['password'])
    if not created:
        user.full_name = admin['name']
        user.province = admin['province']
        user.role = admin['role']
        user.email = admin['email']
        user.is_staff = True
        user.is_superuser = (admin['role'] == 'SUPER_ADMIN')
        updated_count += 1
    else:
        created_count += 1
    user.save()

    status = "[CREATED]" if created else "[UPDATED]"
    print(f"  {status} | {admin['role']:<20} | {admin['province']:<20} | {admin['name']:<25} | CNIC: {admin['cnic']} | PW: {admin['password']}")

print("\n" + "-"*70)
print(f"  ✅ Created: {created_count}  |  🔄 Updated: {updated_count}  |  Total: {len(admins_info)}")
print("="*70)

print("\n📋 QUICK REFERENCE — ADMIN LOGIN CREDENTIALS:")
print("─"*70)
print(f"  {'PROVINCE':<20} {'ROLE':<20} {'CNIC':<20} {'PASSWORD'}")
print("─"*70)
for a in admins_info:
    print(f"  {a['province']:<20} {a['role']:<20} {a['cnic']:<20} {a['password']}")
print("─"*70 + "\n")
