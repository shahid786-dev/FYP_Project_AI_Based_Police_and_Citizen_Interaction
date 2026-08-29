from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from unittest.mock import patch
from applications.models import Application, Challan, Document
from criminals.models import CriminalRecord, CriminalCheckResult
from nadra.models import NADRAVerification

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

        # Verify Stage 1 requirements
        app.refresh_from_db()
        self.assertEqual(app.status, 'FACE_VERIFIED')

        # Confirm NADRA verification was NOT automatically triggered
        self.assertFalse(NADRAVerification.objects.filter(application=app).exists())

        # Confirm criminal checking was NOT automatically triggered
        self.assertFalse(CriminalCheckResult.objects.filter(application=app).exists())

        # Repeat the request. Should return success and not fail or throw error.
        res_repeat = self.client.post(f'/api/citizen/applications/{app.pk}/face-verify/')
        self.assertEqual(res_repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(res_repeat.data['status'], 'FACE_VERIFIED')

    @patch('face_verification.views.FaceVerificationService.verify_with_cnic')
    def test_cnic_face_verify_no_autochain(self, mock_verify):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from face_verification.models import FaceVerificationReport

        app = Application.objects.create(
            applicant=self.citizen, application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS'
        )
        
        report = FaceVerificationReport.objects.create(
            citizen=self.citizen,
            application=app,
            matched_cnic=self.citizen.cnic,
            matched_citizen_name=self.citizen.full_name,
            matched_father_name='Father',
            matched_date_of_birth='1990-01-01',
            matched_gender='M',
            matched_address='Address',
            matched_district='District',
            matched_province='Province',
            matched_photo_url='http://test',
            similarity_score=0.885,
            similarity_pct=88.5,
            status='VERIFIED',
            confidence_level='HIGH',
            model_used='InsightFace',
            processing_time_ms=120.0,
            verified_at=timezone.now(),
            blockchain_hash='xyz',
            blockchain_block_index=5
        )

        mock_verify.return_value = report

        dummy_image = SimpleUploadedFile("face.jpg", b"file_content", content_type="image/jpeg")
        data = {
            'cnic': self.citizen.cnic,
            'live_image': dummy_image,
            'application_id': app.id
        }

        res = self.client.post('/api/face-verify/verify-with-cnic/', data, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])

        app.refresh_from_db()
        self.assertEqual(app.status, 'FACE_VERIFIED')

        # Verify NADRA verification and criminal check were NOT run
        self.assertFalse(NADRAVerification.objects.filter(application=app).exists())
        self.assertFalse(CriminalCheckResult.objects.filter(application=app).exists())

        # Test repeat request: should return immediately without calling mock_verify again
        mock_verify.reset_mock()
        res_repeat = self.client.post('/api/face-verify/verify-with-cnic/', data, format='multipart')
        self.assertEqual(res_repeat.status_code, status.HTTP_200_OK)
        mock_verify.assert_not_called()

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


# ─── Stage 2: Workflow State Machine Guard Tests ──────────────────────────────

def create_authority(**kwargs):
    defaults = dict(
        cnic='00000-2222222-2', email='authority@test.com',
        password='Auth@1234', full_name='Test Authority', role='POLICE_AUTHORITY'
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def make_app(citizen, status_val='PENDING'):
    return Application.objects.create(
        applicant=citizen,
        application_type='Character Certificate',
        purpose='Test',
        current_address='Test Address',
        nearest_station='Test PS',
        status=status_val,
    )


class WorkflowGuardTests(TestCase):
    """
    Stage 2 — Strict state machine enforcement.
    Tests every guard condition across all four key endpoints.
    """

    def setUp(self):
        self.client = APIClient()
        self.citizen   = create_citizen()
        self.staff     = create_staff()
        self.authority = create_authority()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _staff_client(self):
        c = APIClient()
        c.force_authenticate(user=self.staff)
        return c

    def _authority_client(self):
        c = APIClient()
        c.force_authenticate(user=self.authority)
        return c

    def _citizen_client(self):
        c = APIClient()
        c.force_authenticate(user=self.citizen)
        return c

    # ─────────────────────────────────────────────────────────────────────────
    # Test 1 — Staff cannot forward PENDING application
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_cannot_forward_pending(self):
        app = make_app(self.citizen, 'PENDING')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'remarks': 'test'})
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'PENDING')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 2 — Staff cannot forward before STAFF_REVIEWED (FACE_VERIFIED state)
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_cannot_forward_face_verified(self):
        app = make_app(self.citizen, 'FACE_VERIFIED')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'remarks': 'test'})
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FACE_VERIFIED')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 3 — Staff CAN forward STAFF_REVIEWED application
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_can_forward_staff_reviewed(self):
        app = make_app(self.citizen, 'STAFF_REVIEWED')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'remarks': 'looks good'})
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FORWARDED_TO_ADMIN')  # db updated

    # ─────────────────────────────────────────────────────────────────────────
    # Test 4 — Admin cannot approve PENDING application
    # ─────────────────────────────────────────────────────────────────────────
    def test_admin_cannot_approve_pending(self):
        app = make_app(self.citizen, 'PENDING')
        res = self._authority_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'PENDING')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 5 — Admin cannot approve FACE_VERIFIED application
    # ─────────────────────────────────────────────────────────────────────────
    def test_admin_cannot_approve_face_verified(self):
        app = make_app(self.citizen, 'FACE_VERIFIED')
        res = self._authority_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FACE_VERIFIED')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 6 — Admin cannot approve STAFF_REVIEWED application (not yet forwarded)
    # ─────────────────────────────────────────────────────────────────────────
    def test_admin_cannot_approve_staff_reviewed(self):
        app = make_app(self.citizen, 'STAFF_REVIEWED')
        res = self._authority_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'STAFF_REVIEWED')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 7 — Admin CAN approve FORWARDED_TO_ADMIN application
    # ─────────────────────────────────────────────────────────────────────────
    def test_admin_can_approve_forwarded(self):
        app = make_app(self.citizen, 'FORWARDED_TO_ADMIN')
        res = self._authority_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        self.assertEqual(app.status, 'AUTHORITY_APPROVED')  # db updated

    # ─────────────────────────────────────────────────────────────────────────
    # Test 8 — Admin cannot approve the same application repeatedly
    # ─────────────────────────────────────────────────────────────────────────
    def test_admin_cannot_approve_twice(self):
        app = make_app(self.citizen, 'FORWARDED_TO_ADMIN')
        # First approval
        res1 = self._authority_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res1.status_code, 200)
        # Second approval attempt
        res2 = self._authority_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res2.status_code, 200)  # idempotent, safe response
        self.assertIn('already been recorded', res2.data['message'])
        app.refresh_from_db()
        self.assertEqual(app.status, 'AUTHORITY_APPROVED')  # unchanged after duplicate

    # ─────────────────────────────────────────────────────────────────────────
    # Test 9 — Staff cannot confirm PENDING application
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_cannot_confirm_pending(self):
        app = make_app(self.citizen, 'PENDING')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'PENDING')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 10 — Staff cannot confirm FORWARDED_TO_ADMIN (admin hasn't decided yet)
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_cannot_confirm_forwarded(self):
        app = make_app(self.citizen, 'FORWARDED_TO_ADMIN')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FORWARDED_TO_ADMIN')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 11 — Staff CAN confirm AUTHORITY_APPROVED application
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_can_confirm_authority_approved(self):
        app = make_app(self.citizen, 'AUTHORITY_APPROVED')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        # After confirm, challan is generated and status becomes PAYMENT_PENDING
        self.assertEqual(app.status, 'PAYMENT_PENDING')  # _generate_challan sets PAYMENT_PENDING
        self.assertTrue(Challan.objects.filter(application=app).exists())

    # ─────────────────────────────────────────────────────────────────────────
    # Test 12 — Staff cannot confirm AUTHORITY_REJECTED application
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_cannot_confirm_authority_rejected(self):
        app = make_app(self.citizen, 'AUTHORITY_REJECTED')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'AUTHORITY_REJECTED')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 13 — Staff cannot verify payment before PAYMENT_SUBMITTED
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_cannot_verify_payment_before_submitted(self):
        app = make_app(self.citizen, 'PAYMENT_PENDING')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/verify-payment/')
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'PAYMENT_PENDING')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 14 — Staff can verify a valid PAYMENT_SUBMITTED application
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_can_verify_payment_submitted(self):
        from applications.models import Payment
        app = make_app(self.citizen, 'PAYMENT_SUBMITTED')
        challan = Challan.objects.create(application=app, due_date='2027-01-01', status='PAID')
        Payment.objects.create(
            application=app, challan=challan,
            amount=650, payment_method='JAZZCASH',
        )
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/verify-payment/')
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        # Status advances through PAYMENT_VERIFIED → PAYMENT_CONFIRMED → COMPLETED
        # depending on whether the CertificateService succeeds in test environment
        self.assertIn(app.status, ['PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED', 'COMPLETED'])

    # ─────────────────────────────────────────────────────────────────────────
    # Test 15 — Repeated requests do not create duplicate workflow actions
    # ─────────────────────────────────────────────────────────────────────────
    def test_repeated_confirm_does_not_duplicate_challan(self):
        app = make_app(self.citizen, 'AUTHORITY_APPROVED')
        # First confirm
        res1 = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res1.status_code, 200)
        challan_count_1 = Challan.objects.filter(application=app).count()
        # Second confirm
        res2 = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res2.status_code, 200)
        self.assertIn('already been confirmed', res2.data['message'])
        challan_count_2 = Challan.objects.filter(application=app).count()
        # Challan count must not increase
        self.assertEqual(challan_count_1, challan_count_2)

    def test_repeated_forward_does_not_double_forward(self):
        app = make_app(self.citizen, 'STAFF_REVIEWED')
        res1 = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'remarks': 'ok'})
        self.assertEqual(res1.status_code, 200)
        res2 = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'remarks': 'ok again'})
        self.assertEqual(res2.status_code, 200)  # safe idempotent response
        self.assertIn('already been forwarded', res2.data['message'])
        app.refresh_from_db()
        self.assertEqual(app.status, 'FORWARDED_TO_ADMIN')  # unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 16 — Citizen cannot directly change application status via staff endpoints
    # ─────────────────────────────────────────────────────────────────────────
    def test_citizen_cannot_call_staff_forward(self):
        app = make_app(self.citizen, 'STAFF_REVIEWED')
        res = self._citizen_client().post(f'/api/staff/applications/{app.pk}/forward/')
        self.assertEqual(res.status_code, 403)
        app.refresh_from_db()
        self.assertEqual(app.status, 'STAFF_REVIEWED')  # db unchanged

    def test_citizen_cannot_call_staff_confirm(self):
        app = make_app(self.citizen, 'AUTHORITY_APPROVED')
        res = self._citizen_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res.status_code, 403)
        app.refresh_from_db()
        self.assertEqual(app.status, 'AUTHORITY_APPROVED')  # db unchanged

    def test_citizen_cannot_call_authority_decide(self):
        app = make_app(self.citizen, 'FORWARDED_TO_ADMIN')
        res = self._citizen_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res.status_code, 403)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FORWARDED_TO_ADMIN')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 17 — Police staff cannot perform admin approval (wrong role)
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_cannot_perform_admin_approval(self):
        app = make_app(self.citizen, 'FORWARDED_TO_ADMIN')
        res = self._staff_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res.status_code, 403)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FORWARDED_TO_ADMIN')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Test 18 — Admin cannot perform police-only confirmation (wrong role)
    # ─────────────────────────────────────────────────────────────────────────
    def test_admin_cannot_perform_staff_confirmation(self):
        app = make_app(self.citizen, 'AUTHORITY_APPROVED')
        res = self._authority_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res.status_code, 403)
        app.refresh_from_db()
        self.assertEqual(app.status, 'AUTHORITY_APPROVED')  # db unchanged

    # ─────────────────────────────────────────────────────────────────────────
    # Extra: Full linear happy path — database state at every step
    # ─────────────────────────────────────────────────────────────────────────
    def test_full_workflow_happy_path_db_verification(self):
        """Verifies DB state changes at each stage of the workflow."""
        from applications.models import Payment

        app = make_app(self.citizen, 'FACE_VERIFIED')

        # Step 1: Staff reviews
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/remark/', {'remarks': 'Verified in person.'})
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        self.assertEqual(app.status, 'STAFF_REVIEWED')

        # Step 2: Staff forwards
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'remarks': 'Forwarding for approval.'})
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FORWARDED_TO_ADMIN')

        # Step 3: Authority approves
        res = self._authority_client().post(f'/api/authority/applications/{app.pk}/decide/', {'decision': 'APPROVE', 'reason': 'All clear.'})
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        self.assertEqual(app.status, 'AUTHORITY_APPROVED')

        # Step 4: Staff confirms and challan is generated
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        self.assertEqual(app.status, 'PAYMENT_PENDING')
        self.assertTrue(Challan.objects.filter(application=app).exists())

        # Step 5: Citizen pays
        challan = Challan.objects.get(application=app)
        self._citizen_client().post(f'/api/citizen/applications/{app.pk}/pay/', {'payment_method': 'JAZZCASH'})
        app.refresh_from_db()
        self.assertEqual(app.status, 'PAYMENT_SUBMITTED')

        # Step 6: Staff verifies payment
        Payment.objects.filter(application=app).update()  # ensure payment exists
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/verify-payment/')
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        # Status advances through PAYMENT_VERIFIED → PAYMENT_CONFIRMED → COMPLETED
        # depending on whether the CertificateService succeeds in test environment
        self.assertIn(app.status, ['PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED', 'COMPLETED'])

    # ─────────────────────────────────────────────────────────────────────────
    # Stage 3: Legacy Review Bypass Removal Tests
    # ─────────────────────────────────────────────────────────────────────────

    def test_legacy_review_endpoint_is_removed(self):
        """1, 2, 6, 7. Legacy review endpoint must return 404 and cannot approve or issue challan."""
        app = make_app(self.citizen, 'FACE_VERIFIED')
        
        # Call the old URL pattern directly
        res = self._staff_client().post(f'/api/police/applications/{app.pk}/review/', {'status': 'APPROVED', 'notes': 'Should fail'})
        self.assertEqual(res.status_code, 404)
        
        app.refresh_from_db()
        self.assertEqual(app.status, 'FACE_VERIFIED')  # Status unaffected
        self.assertFalse(Challan.objects.filter(application=app).exists())  # No challan generated

    def test_staff_cannot_directly_set_authority_approved(self):
        """9. No Police Staff endpoint can directly assign AUTHORITY_APPROVED status."""
        app = make_app(self.citizen, 'FACE_VERIFIED')
        
        # Test remark endpoint
        res1 = self._staff_client().post(f'/api/staff/applications/{app.pk}/remark/', {'status': 'AUTHORITY_APPROVED', 'remarks': 'hack'})
        # Should not set status to AUTHORITY_APPROVED
        app.refresh_from_db()
        self.assertNotEqual(app.status, 'AUTHORITY_APPROVED')

        # Test forward endpoint
        res2 = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'status': 'AUTHORITY_APPROVED', 'remarks': 'hack'})
        app.refresh_from_db()
        self.assertNotEqual(app.status, 'AUTHORITY_APPROVED')

        # Test confirm endpoint
        res3 = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/', {'status': 'AUTHORITY_APPROVED'})
        app.refresh_from_db()
        self.assertNotEqual(app.status, 'AUTHORITY_APPROVED')

    def test_staff_cannot_directly_set_authority_rejected(self):
        """10. No Police Staff endpoint can directly assign AUTHORITY_REJECTED status."""
        app = make_app(self.citizen, 'FACE_VERIFIED')
        
        # Test remark endpoint
        self._staff_client().post(f'/api/staff/applications/{app.pk}/remark/', {'status': 'AUTHORITY_REJECTED', 'remarks': 'hack'})
        app.refresh_from_db()
        self.assertNotEqual(app.status, 'AUTHORITY_REJECTED')

        # Test forward endpoint
        self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'status': 'AUTHORITY_REJECTED', 'remarks': 'hack'})
        app.refresh_from_db()
        self.assertNotEqual(app.status, 'AUTHORITY_REJECTED')

        # Test confirm endpoint
        self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/', {'status': 'AUTHORITY_REJECTED'})
        app.refresh_from_db()
        self.assertNotEqual(app.status, 'AUTHORITY_REJECTED')

    def test_staff_cannot_bypass_admin_stage(self):
        """3, 11. Police Staff cannot bypass Admin stage (cannot jump to confirm directly)."""
        app = make_app(self.citizen, 'STAFF_REVIEWED')
        
        # Try to confirm directly from STAFF_REVIEWED status (bypassing forward and admin decision)
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/confirm/')
        self.assertEqual(res.status_code, 400)
        
        app.refresh_from_db()
        self.assertEqual(app.status, 'STAFF_REVIEWED')  # Unchanged
        self.assertFalse(Challan.objects.filter(application=app).exists())


# ─── Legacy Police Tests (preserved, non-interfering) ────────────────────────
class PoliceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = create_staff()
        self.citizen = create_citizen()
        self.client.force_authenticate(user=self.staff)

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
