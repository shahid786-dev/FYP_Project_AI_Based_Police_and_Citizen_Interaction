from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from criminals.models import CriminalRecord
from chatbot.models import FaqKnowledge
import datetime

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial demo data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Seeding database...'))

        # ─── Super Admin ───────────────────────────────────────────────
        if not User.objects.filter(cnic='00000-0000000-0').exists():
            User.objects.create_superuser(
                cnic='00000-0000000-0',
                email='admin@pakverify.gov.pk',
                password='Admin@123',
                full_name='Super Administrator',
                role='SUPER_ADMIN'
            )
            self.stdout.write(self.style.SUCCESS('  [OK] Super Admin created  (CNIC: 00000-0000000-0 / Pass: Admin@123)'))

        # ─── Police Authority ──────────────────────────────────────────
        if not User.objects.filter(cnic='00000-0000001-0').exists():
            User.objects.create_user(
                cnic='00000-0000001-0',
                email='authority@pakverify.gov.pk',
                password='Authority@123',
                full_name='DIG Muhammad Tariq',
                role='POLICE_AUTHORITY',
                province='Punjab',
                district='Lahore'
            )
            self.stdout.write(self.style.SUCCESS('  [OK] Police Authority created (CNIC: 00000-0000001-0 / Pass: Authority@123)'))

        # ─── Police Staff ──────────────────────────────────────────────
        if not User.objects.filter(cnic='00000-0000002-0').exists():
            User.objects.create_user(
                cnic='00000-0000002-0',
                email='staff@pakverify.gov.pk',
                password='Staff@123',
                full_name='SI Asif Nawaz',
                role='POLICE_STAFF',
                province='Punjab',
                district='Lahore'
            )
            self.stdout.write(self.style.SUCCESS('  [OK] Police Staff created  (CNIC: 00000-0000002-0 / Pass: Staff@123)'))

        # ─── Demo Citizen ──────────────────────────────────────────────
        if not User.objects.filter(cnic='35202-1234567-1').exists():
            User.objects.create_user(
                cnic='35202-1234567-1',
                email='citizen@example.com',
                password='Citizen@123',
                full_name='Muhammad Ali Khan',
                father_name='Haji Muhammad Iqbal',
                gender='Male',
                mobile_number='03001234567',
                province='Punjab',
                district='Lahore',
                address='House 12, Street 5, DHA Phase 4, Lahore',
                role='CITIZEN'
            )
            self.stdout.write(self.style.SUCCESS('  [OK] Demo Citizen created  (CNIC: 35202-1234567-1 / Pass: Citizen@123)'))

        # ─── Criminal Records ──────────────────────────────────────────
        criminals_data = [
            {'cnic': '42101-9876543-2', 'name': 'Shafiq Ahmed',    'crime_type': 'Robbery',    'fir_number': 'FIR-2024-001', 'police_station': 'Gulberg PS, Lahore',   'status': 'CRIMINAL_MATCH'},
            {'cnic': '35202-5555555-5', 'name': 'Farooq Sabir',    'crime_type': 'Fraud',      'fir_number': 'FIR-2024-015', 'police_station': 'Sadar PS, Karachi',    'status': 'SUSPECTED'},
            {'cnic': '61101-1111111-1', 'name': 'Gul Khan',        'crime_type': 'Drug Trafficking', 'fir_number': 'FIR-2023-098', 'police_station': 'F-8 PS, Islamabad', 'status': 'CRIMINAL_MATCH'},
        ]
        for c in criminals_data:
            if not CriminalRecord.objects.filter(cnic=c['cnic']).exists():
                CriminalRecord.objects.create(**c)
        self.stdout.write(self.style.SUCCESS(f'  [OK] {len(criminals_data)} Criminal records seeded'))

        # ─── FAQ Knowledge Base ────────────────────────────────────────
        faqs = [
            {'question': 'How to apply for character certificate?',  'category': 'application', 'answer': 'Login -> New Request -> Character Certificate -> Upload CNIC + Photo -> Submit. Processing: 3-7 days.'},
            {'question': 'What documents are required?',             'category': 'documents',   'answer': 'CNIC Front & Back, Passport Photo, Proof of Address (utility bill).'},
            {'question': 'How long does verification take?',         'category': 'timeline',    'answer': 'Standard: 3-5 working days. Urgent: 24-48 hours (extra fee).'},
            {'question': 'What are the payment methods?',            'category': 'payment',     'answer': 'JazzCash, EasyPaisa, Credit/Debit Card, Bank Transfer. Total: PKR 650.'},
            {'question': 'How can I track my application?',          'category': 'tracking',    'answer': 'Go to Track Application and enter your Tracking ID received via SMS/Email.'},
            {'question': 'Is my data secure?',                       'category': 'security',    'answer': 'Yes. All data is AES-256 encrypted and stored on government servers.'},
        ]
        created_count = 0
        for f in faqs:
            obj, created = FaqKnowledge.objects.get_or_create(question=f['question'], defaults=f)
            if created:
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f'  [OK] {created_count} FAQ entries seeded'))

        self.stdout.write(self.style.SUCCESS('\n[OK] Database seeding complete!'))
        self.stdout.write(self.style.WARNING('\nDemo Login Credentials:'))
        self.stdout.write('  Super Admin  -> CNIC: 00000-0000000-0  | Pass: Admin@123')
        self.stdout.write('  Authority    -> CNIC: 00000-0000001-0  | Pass: Authority@123')
        self.stdout.write('  Police Staff -> CNIC: 00000-0000002-0  | Pass: Staff@123')
        self.stdout.write('  Citizen      -> CNIC: 35202-1234567-1  | Pass: Citizen@123')
