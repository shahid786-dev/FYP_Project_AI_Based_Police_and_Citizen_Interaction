"""
Management command: seed_nadra
Populates the NADRA dummy database with realistic Pakistani citizen records.
Run: python manage.py seed_nadra
"""

import datetime
from django.core.management.base import BaseCommand
from nadra.models import NADRARecord


DUMMY_RECORDS = [
    dict(cnic='35202-1234567-1', full_name='Muhammad Ali Khan',    father_name='Ghulam Ali Khan',
         date_of_birth=datetime.date(1990, 3, 15), gender='M',
         address='House 12, Street 5, Gulberg III', district='Lahore', province='Punjab'),
    dict(cnic='35202-2345678-2', full_name='Fatima Noor',          father_name='Abdul Noor',
         date_of_birth=datetime.date(1995, 7, 22), gender='F',
         address='Plot 44, Block D, PECHS', district='Karachi', province='Sindh'),
    dict(cnic='35202-3456789-3', full_name='Ahmed Hassan Siddiqui',father_name='Hassan Siddiqui',
         date_of_birth=datetime.date(1988, 11, 30), gender='M',
         address='Flat 7, Askari Apartments', district='Rawalpindi', province='Punjab'),
    dict(cnic='35202-4567890-4', full_name='Ayesha Malik',         father_name='Tariq Malik',
         date_of_birth=datetime.date(1993, 5, 10), gender='F',
         address='Bungalow 3, Phase 6, DHA', district='Lahore', province='Punjab'),
    dict(cnic='35202-5678901-5', full_name='Usman Farooq',         father_name='Farooq Ahmed',
         date_of_birth=datetime.date(1985, 8, 5), gender='M',
         address='House 88, Model Town', district='Lahore', province='Punjab'),
    dict(cnic='35202-6789012-6', full_name='Sana Rehman',          father_name='Abdul Rehman',
         date_of_birth=datetime.date(1998, 2, 28), gender='F',
         address='Street 14, F-7', district='Islamabad', province='ICT'),
    dict(cnic='35202-7890123-7', full_name='Bilal Chaudhry',       father_name='Saeed Chaudhry',
         date_of_birth=datetime.date(1982, 12, 1), gender='M',
         address='Village Chak 44, Tehsil Sargodha', district='Sargodha', province='Punjab'),
    dict(cnic='35202-8901234-8', full_name='Mariam Sheikh',        father_name='Iqbal Sheikh',
         date_of_birth=datetime.date(1991, 4, 19), gender='F',
         address='Unit 201, Clifton Block 5', district='Karachi', province='Sindh'),
    dict(cnic='35202-9012345-9', full_name='Zain ul Abideen',      father_name='Abid Hussain',
         date_of_birth=datetime.date(1997, 9, 6), gender='M',
         address='House 33, Chaklala Scheme III', district='Rawalpindi', province='Punjab'),
    dict(cnic='35202-0123456-0', full_name='Hina Baig',            father_name='Zafar Baig',
         date_of_birth=datetime.date(1994, 6, 14), gender='F',
         address='Flat 12, Askari 14', district='Peshawar', province='KPK'),
    dict(cnic='42101-1111111-1', full_name='Imran Raza Mirza',     father_name='Raza Mirza',
         date_of_birth=datetime.date(1979, 1, 20), gender='M',
         address='Plot 17, Tariq Road', district='Karachi', province='Sindh'),
    dict(cnic='42101-2222222-2', full_name='Nadia Qureshi',        father_name='Asif Qureshi',
         date_of_birth=datetime.date(1996, 10, 3), gender='F',
         address='House 55, G-9/2', district='Islamabad', province='ICT'),
    dict(cnic='42101-3333333-3', full_name='Faisal Javed',         father_name='Javed Akhtar',
         date_of_birth=datetime.date(1987, 3, 25), gender='M',
         address='Chaman Housing Scheme, Block B', district='Quetta', province='Balochistan'),
    dict(cnic='42101-4444444-4', full_name='Saira Hameed',         father_name='Abdul Hameed',
         date_of_birth=datetime.date(1992, 7, 7), gender='F',
         address='Street 4, Hayatabad Phase 2', district='Peshawar', province='KPK'),
    dict(cnic='42101-5555555-5', full_name='Omer Saleem',          father_name='Muhammad Saleem',
         date_of_birth=datetime.date(1983, 11, 11), gender='M',
         address='House 9, Shah Faisal Colony', district='Karachi', province='Sindh'),
    dict(cnic='42101-6666666-6', full_name='Rabia Tariq',          father_name='Tariq Hussain',
         date_of_birth=datetime.date(1999, 1, 30), gender='F',
         address='Johar Town Block A', district='Lahore', province='Punjab'),
    dict(cnic='42101-7777777-7', full_name='Shahid Nawaz',         father_name='Nawaz Ahmed',
         date_of_birth=datetime.date(1975, 5, 5), gender='M',
         address='House 2, Satellite Town', district='Rawalpindi', province='Punjab'),
    dict(cnic='42101-8888888-8', full_name='Asma Iqbal',           father_name='Iqbal Ahmed',
         date_of_birth=datetime.date(1989, 8, 17), gender='F',
         address='Block 14, Federal B Area', district='Karachi', province='Sindh'),
    dict(cnic='42101-9999999-9', full_name='Tariq Mehmood',        father_name='Mehmood ul Haq',
         date_of_birth=datetime.date(1980, 2, 28), gender='M',
         address='Village Kahuta, Tehsil Kahuta', district='Rawalpindi', province='Punjab'),
    dict(cnic='42101-0000000-0', full_name='Zunera Waseem',        father_name='Waseem Ahmad',
         date_of_birth=datetime.date(2000, 12, 5), gender='F',
         address='House 67, I-8/3', district='Islamabad', province='ICT'),
]


class Command(BaseCommand):
    help = 'Seed the NADRA dummy database with 20 citizen records'

    def handle(self, *args, **options):
        created_count = 0
        for data in DUMMY_RECORDS:
            obj, created = NADRARecord.objects.get_or_create(
                cnic=data['cnic'],
                defaults=data,
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'✓ NADRA seed complete: {created_count} new records created '
                f'({len(DUMMY_RECORDS) - created_count} already existed).'
            )
        )
