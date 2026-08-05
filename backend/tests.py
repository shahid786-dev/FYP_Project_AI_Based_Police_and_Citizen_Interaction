from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from applications.models import Application, Challan, Document
from criminals.models import CriminalRecord

User = get_user_model()

def create_citizen(**kwargs):
    defaults = dict(
        cnic='35202-1234567-9', email='test@example.com',
        password='Test@1234', full_name='Test Citizen',
        role='CITIZEN', province='Punjab', district='Lahore'
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)

def create_staff(**kwargs):
    defaults = dict(
        cnic='00000-1111111-1', email='staff@test.com',
        password='Staff@1234', full_name='Test Staff', role='POLICE_STAFF'
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


# ─── Auth Tests ──────────────────────────────────────────────────────────────
class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_citizen(self):
        data = {
            'cnic': '35202-7777777-7', 'email': 'new@test.com',
            'password': 'Pass@1234', 'full_name': 'New Citizen',
            'province': 'Punjab', 'district': 'Lahore'
        }
        res = self.client.post('/api/auth/register/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('otp_code', res.data)

    def test_register_duplicate_cnic_fails(self):
        create_citizen()
        data = {'cnic': '35202-1234567-9', 'email': 'other@test.com', 'password': 'x', 'full_name': 'X'}
        res = self.client.post('/api/auth/register/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_otp(self):
        create_citizen()
        res = self.client.post('/api/auth/login/', {'cnic': '35202-1234567-9', 'password': 'Test@1234'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('otp_code', res.data)

    def test_login_wrong_password(self):
        create_citizen()
        res = self.client.post('/api/auth/login/', {'cnic': '35202-1234567-9', 'password': 'Wrong'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_otp_verify_bypass(self):
        user = create_citizen()
        res = self.client.post('/api/auth/verify-otp/', {'cnic': user.cnic, 'otp_code': '123456'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertEqual(res.data['role'], 'CITIZEN')


# ─── Application Tests ────────────────────────────────────────────────────────
class ApplicationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.citizen = create_citizen()
        self.client.force_authenticate(user=self.citizen)

    def test_create_application(self):
        data = {
            'application_type': 'Character Certificate',
            'purpose': 'Job application',
            'current_address': 'House 1, DHA Lahore',
            'nearest_station': 'Gulberg PS, Lahore'
        }
        res = self.client.post('/api/citizen/applications/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('tracking_id', res.data)
        # Challan auto-generated
        app = Application.objects.get(pk=res.data['id'])
        self.assertTrue(Challan.objects.filter(application=app).exists())

    def test_citizen_cannot_see_other_citizen_apps(self):
        other = create_citizen(cnic='35202-9999999-9', email='other@test.com')
        Application.objects.create(
            applicant=other, application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS'
        )
        res = self.client.get('/api/citizen/applications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for item in res.data:
            self.assertEqual(item['applicant']['cnic'], self.citizen.cnic)

    def test_face_verify_simulation(self):
        app = Application.objects.create(
            applicant=self.citizen, application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS'
        )
        Document.objects.create(application=app, document_type='PASSPORT_PHOTO', file='dummy.jpg')
        # No live_image → triggers simulation fallback
        res = self.client.post(f'/api/citizen/applications/{app.pk}/face-verify/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['confidence'], 90.0)

    def test_process_payment(self):
        app = Application.objects.create(
            applicant=self.citizen, application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS'
        )
        Challan.objects.create(application=app, due_date='2027-01-01')
        res = self.client.post(f'/api/citizen/applications/{app.pk}/pay/', {'payment_method': 'jazzcash'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['challan_status'], 'PAID')
        self.assertEqual(res.data['application_status'], 'UNDER_REVIEW')


# ─── Police Tests ─────────────────────────────────────────────────────────────
class PoliceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = create_staff()
        self.citizen = create_citizen()
        self.client.force_authenticate(user=self.staff)

    def test_staff_can_approve_application(self):
        app = Application.objects.create(
            applicant=self.citizen, application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS',
            status='UNDER_REVIEW'
        )
        res = self.client.post(f'/api/police/applications/{app.pk}/review/',
                               {'status': 'APPROVED', 'notes': 'Looks good.'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'COMPLETED')
        self.assertTrue(hasattr(app, 'certificate'))

    def test_criminal_search_by_cnic_clean(self):
        res = self.client.post('/api/criminals/search/', {'cnic': '35202-0000000-0'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'CLEAN')

    def test_criminal_search_finds_record(self):
        CriminalRecord.objects.create(cnic='42101-9876543-2', name='Test Criminal', status='CRIMINAL_MATCH')
        res = self.client.post('/api/criminals/search/', {'cnic': '42101-9876543-2'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'CRIMINAL_MATCH')


# ─── Chatbot Tests ────────────────────────────────────────────────────────────
class ChatbotTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_chatbot_responds_to_faq(self):
        res = self.client.post('/api/chatbot/chat/', {'message': 'How do I apply for certificate?'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('reply', res.data)
        self.assertTrue(len(res.data['reply']) > 10)

    def test_chatbot_empty_message_fails(self):
        res = self.client.post('/api/chatbot/chat/', {'message': ''})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
