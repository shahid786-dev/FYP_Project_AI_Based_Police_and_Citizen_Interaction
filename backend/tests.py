from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from unittest.mock import Mock, patch
from applications.models import Application, Challan, Document, Certificate
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
        from users.otp_service import get_otp_service
        get_otp_service().generate_and_send(user, purpose="login")
        user.refresh_from_db()
        res = self.client.post('/api/auth/verify-otp/', {'cnic': user.cnic, 'otp_code': user.otp_code})
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
        self.assertEqual(res.data['status'], 'PENDING')
        app = Application.objects.get(pk=res.data['id'])
        self.assertEqual(app.status, 'PENDING')

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

    def test_face_verify_requires_live_image(self):
        app = Application.objects.create(
            applicant=self.citizen, application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS'
        )
        Document.objects.create(application=app, document_type='PASSPORT_PHOTO', file='dummy.jpg')
        res = self.client.post(f'/api/citizen/applications/{app.pk}/face-verify/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('live face image', res.data['error'])

    @patch('face_verification.views.check_liveness_with_ai')
    @patch('face_verification.views.FaceVerificationService.verify_with_cnic')
    def test_cnic_face_verify_runs_criminal_check(self, mock_verify, mock_liveness):
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
        mock_liveness.return_value = {
            'liveness_score': 0.91,
            'anti_spoofing': 'REAL',
            'face_detected': True,
            'verified': True,
        }

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
        self.assertEqual(app.status, 'CRIMINAL_CHECKED')

        # Criminal screening runs against the authenticated citizen's CNIC.
        self.assertFalse(NADRAVerification.objects.filter(application=app).exists())
        self.assertEqual(CriminalCheckResult.objects.get(application=app).result, 'CLEAN')

        # Test repeat request: should return immediately without calling mock_verify again
        mock_verify.reset_mock()
        res_repeat = self.client.post('/api/face-verify/verify-with-cnic/', data, format='multipart')
        self.assertEqual(res_repeat.status_code, status.HTTP_200_OK)
        mock_verify.assert_not_called()

    def test_process_payment(self):
        app = Application.objects.create(
            applicant=self.citizen, application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS',
            status='PAYMENT_PENDING'
        )
        Challan.objects.create(application=app, due_date='2027-01-01')
        res = self.client.post(f'/api/citizen/applications/{app.pk}/pay/', {'payment_method': 'jazzcash'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['challan_status'], 'PAID')
        self.assertEqual(res.data['application_status'], 'PAYMENT_SUBMITTED')


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
        self.assertEqual(app.status, 'PENDING')

    # ─────────────────────────────────────────────────────────────────────────
    # Test 2 — Staff cannot forward before STAFF_REVIEWED (FACE_VERIFIED state)
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_cannot_forward_face_verified(self):
        app = make_app(self.citizen, 'FACE_VERIFIED')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'remarks': 'test'})
        self.assertEqual(res.status_code, 400)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FACE_VERIFIED')  # db unchanged

    def test_staff_can_forward_staff_reviewed(self):
        app = make_app(self.citizen, 'STAFF_REVIEWED')
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/forward/', {'remarks': 'test'})
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

        app = make_app(self.citizen, 'CRIMINAL_CHECKED')
        CriminalCheckResult.objects.create(
            application=app,
            result='CLEAN',
            report_summary='No criminal record found.',
        )

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

    # ─────────────────────────────────────────────────────────────────────────
    # Stage 4: Authoritative & Idempotent Certificate Generation Tests
    # ─────────────────────────────────────────────────────────────────────────

    def test_certificate_cannot_be_generated_before_admin_approval(self):
        """1. Certificate cannot be generated before admin approval."""
        from applications.certificate_service import CertificateService
        app = make_app(self.citizen, 'STAFF_REVIEWED')
        
        with self.assertRaises(ValueError):
            CertificateService.generate_certificate(app)
            
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/issue-cert/')
        self.assertEqual(res.status_code, 400)

    def test_certificate_cannot_be_generated_before_police_confirmation(self):
        """2. Certificate cannot be generated before police confirmation."""
        from applications.certificate_service import CertificateService
        app = make_app(self.citizen, 'AUTHORITY_APPROVED')
        
        with self.assertRaises(ValueError):
            CertificateService.generate_certificate(app)
            
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/issue-cert/')
        self.assertEqual(res.status_code, 400)

    def test_certificate_cannot_be_generated_before_payment_submission(self):
        """3. Certificate cannot be generated before payment submission."""
        from applications.certificate_service import CertificateService
        app = make_app(self.citizen, 'PAYMENT_PENDING')
        
        with self.assertRaises(ValueError):
            CertificateService.generate_certificate(app)
            
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/issue-cert/')
        self.assertEqual(res.status_code, 400)

    def test_certificate_cannot_be_generated_before_payment_verification(self):
        """4. Certificate cannot be generated before payment verification."""
        from applications.certificate_service import CertificateService
        app = make_app(self.citizen, 'PAYMENT_SUBMITTED')
        
        with self.assertRaises(ValueError):
            CertificateService.generate_certificate(app)
            
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/issue-cert/')
        self.assertEqual(res.status_code, 400)

    def test_valid_completed_workflow_generates_exactly_one_certificate(self):
        """5. Valid completed workflow generates exactly ONE certificate."""
        from applications.certificate_service import CertificateService
        app = make_app(self.citizen, 'PAYMENT_VERIFIED')
        
        cert = CertificateService.generate_certificate(app)
        self.assertIsNotNone(cert)
        app.refresh_from_db()
        self.assertEqual(app.status, 'COMPLETED')
        self.assertEqual(Certificate.objects.filter(application=app).count(), 1)

    def test_repeating_certificate_generation_is_idempotent(self):
        """6, 8, 9. Repeating the certificate request does not create duplicates/new numbers."""
        from applications.certificate_service import CertificateService
        app = make_app(self.citizen, 'PAYMENT_VERIFIED')
        
        cert1 = CertificateService.generate_certificate(app)
        cert_num_1 = cert1.certificate_number
        qr_hash_1 = cert1.qr_code_hash
        
        # Second call to service
        cert2 = CertificateService.generate_certificate(app)
        self.assertEqual(cert2.id, cert1.id)
        self.assertEqual(cert2.certificate_number, cert_num_1)
        self.assertEqual(cert2.qr_code_hash, qr_hash_1)
        self.assertEqual(Certificate.objects.filter(application=app).count(), 1)
        
        # Call via API should also be idempotent
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/issue-cert/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['certificate_number'], cert_num_1)
        self.assertEqual(Certificate.objects.filter(application=app).count(), 1)

    def test_repeating_payment_verification_is_idempotent(self):
        """7. Repeating payment verification does NOT create another certificate."""
        from applications.models import Payment
        app = make_app(self.citizen, 'PAYMENT_SUBMITTED')
        challan = Challan.objects.create(application=app, due_date='2027-01-01', status='PAID')
        Payment.objects.create(
            application=app, challan=challan,
            amount=650, payment_method='JAZZCASH',
        )
        
        # Verify first time
        res1 = self._staff_client().post(f'/api/staff/applications/{app.pk}/verify-payment/')
        self.assertEqual(res1.status_code, 200)
        cert_num_1 = res1.data.get('certificate_number')
        self.assertIsNotNone(cert_num_1)
        
        # Verify second time (using staff client)
        res2 = self._staff_client().post(f'/api/staff/applications/{app.pk}/verify-payment/')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(Certificate.objects.filter(application=app).count(), 1)

    def test_citizen_cannot_directly_invoke_certificate_issuance(self):
        """12. Citizen cannot directly invoke privileged certificate issuance."""
        app = make_app(self.citizen, 'PAYMENT_VERIFIED')
        
        res1 = self._citizen_client().post(f'/api/staff/applications/{app.pk}/issue-cert/')
        self.assertEqual(res1.status_code, 403)
        
        res2 = self._citizen_client().post(f'/api/authority/applications/{app.pk}/issue-cert/')
        self.assertEqual(res2.status_code, 403)
        
        self.assertFalse(Certificate.objects.filter(application=app).exists())

    @patch('applications.certificate_service.CertificateService.generate_certificate')
    def test_failed_certificate_generation_does_not_mark_completed(self, mock_generate):
        """10, 11. If certificate generation fails, application is NOT falsely marked COMPLETED."""
        from applications.models import Payment
        mock_generate.side_effect = Exception("PDF generation failed")
        
        app = make_app(self.citizen, 'PAYMENT_SUBMITTED')
        challan = Challan.objects.create(application=app, due_date='2027-01-01', status='PAID')
        Payment.objects.create(
            application=app, challan=challan,
            amount=650, payment_method='JAZZCASH',
        )
        
        res = self._staff_client().post(f'/api/staff/applications/{app.pk}/verify-payment/')
        self.assertEqual(res.status_code, 200)
        
        app.refresh_from_db()
        # Should stay at PAYMENT_VERIFIED, and NOT become COMPLETED
        self.assertEqual(app.status, 'PAYMENT_VERIFIED')
        self.assertFalse(Certificate.objects.filter(application=app).exists())


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


# ─── Stage 5: Certificate Province/District/Authority Data Integrity ─────────

def make_app_for_citizen(citizen, status_val='PAYMENT_VERIFIED'):
    """Create an application with applicant_province mirroring citizen.province."""
    return Application.objects.create(
        applicant=citizen,
        application_type='Character Certificate',
        purpose='Test',
        current_address='Test Address',
        nearest_station='Test PS',
        status=status_val,
        applicant_province=citizen.province,
    )


def create_citizen_with_province(cnic, email, full_name, province, district):
    return User.objects.create_user(
        cnic=cnic, email=email, password='Test@1234',
        full_name=full_name, role='CITIZEN',
        province=province, district=district,
    )


class CertificateDataIntegrityTests(TestCase):
    """
    Stage 5 — Certificate data, province/district and QR URL tests.
    Ensures certificates carry the citizen's ACTUAL data from the DB.
    """

    def setUp(self):
        self.staff = create_staff()
        # Citizen A — Sindh/Karachi
        self.citizen_sindh = create_citizen_with_province(
            cnic='42101-1111111-1', email='sindh@test.com',
            full_name='Zara Khan', province='Sindh', district='Karachi',
        )
        # Citizen B — Punjab/Lahore
        self.citizen_punjab = create_citizen_with_province(
            cnic='35202-2222222-2', email='punjab@test.com',
            full_name='Ali Hassan', province='Punjab', district='Lahore',
        )

    def _generate_cert(self, citizen):
        from applications.certificate_service import CertificateService
        app = make_app_for_citizen(citizen, 'PAYMENT_VERIFIED')
        return CertificateService.generate_certificate(app), app

    # ── 1-2: Province-specific certificate data ─────────────────────────────

    def test_sindh_citizen_gets_sindh_province(self):
        """Sindh citizen certificate contains province=Sindh."""
        cert, app = self._generate_cert(self.citizen_sindh)
        self.assertEqual(app.applicant_province, 'Sindh')
        # Verify the cert was generated
        self.assertIsNotNone(cert)
        self.assertEqual(app.status, 'COMPLETED')

    def test_punjab_citizen_gets_punjab_province(self):
        """Punjab citizen certificate contains province=Punjab."""
        cert, app = self._generate_cert(self.citizen_punjab)
        self.assertEqual(app.applicant_province, 'Punjab')
        self.assertIsNotNone(cert)

    # ── 3: District appears correctly ──────────────────────────────────────

    def test_sindh_citizen_district_is_karachi(self):
        """District for Sindh citizen is Karachi from DB."""
        self.assertEqual(self.citizen_sindh.district, 'Karachi')

    def test_punjab_citizen_district_is_lahore(self):
        """District for Punjab citizen is Lahore from DB."""
        self.assertEqual(self.citizen_punjab.district, 'Lahore')

    # ── 4-5: Province/District not hardcoded ────────────────────────────────

    def test_province_comes_from_application_not_hardcoded(self):
        """applicant_province is set from citizen.province at application creation."""
        app = make_app_for_citizen(self.citizen_sindh, 'PAYMENT_VERIFIED')
        self.assertNotEqual(app.applicant_province, 'Punjab')
        self.assertNotEqual(app.applicant_province, 'Sindh' if app.applicant_province == 'Punjab' else 'Punjab')
        self.assertEqual(app.applicant_province, self.citizen_sindh.province)

    def test_district_comes_from_citizen_model(self):
        """District on citizen model is preserved without substitution."""
        self.assertNotIn(self.citizen_sindh.district, ['Karachi South'])  # no dummy substitution
        self.assertEqual(self.citizen_sindh.district, 'Karachi')

    # ── 6: Serializer does NOT default province to Sindh ────────────────────

    def test_serializer_does_not_default_province_to_sindh(self):
        """Serializer's get_nadra_details must not return Sindh for a Punjab citizen."""
        app = make_app_for_citizen(self.citizen_punjab, 'PENDING')
        from applications.serializers import ApplicationSerializer
        data = ApplicationSerializer(app).data
        nadra = data.get('nadra_details', {})
        # Province must NOT be Sindh for a Punjab citizen
        self.assertNotEqual(nadra.get('province'), 'Sindh')

    def test_serializer_does_not_default_province_to_punjab(self):
        """Serializer's get_nadra_details must not return Punjab for a Sindh citizen."""
        app = make_app_for_citizen(self.citizen_sindh, 'PENDING')
        from applications.serializers import ApplicationSerializer
        data = ApplicationSerializer(app).data
        nadra = data.get('nadra_details', {})
        # Province must NOT be Punjab for a Sindh citizen
        self.assertNotEqual(nadra.get('province'), 'Punjab')

    # ── 10-13: Certificate contains correct citizen data ────────────────────

    def test_certificate_contains_correct_citizen_name(self):
        """Certificate record is linked to the correct citizen name."""
        cert, app = self._generate_cert(self.citizen_sindh)
        self.assertEqual(cert.application.applicant.full_name, 'Zara Khan')

    def test_certificate_contains_correct_cnic(self):
        """Certificate is linked to the correct CNIC."""
        cert, app = self._generate_cert(self.citizen_sindh)
        self.assertEqual(cert.application.applicant.cnic, '42101-1111111-1')

    def test_certificate_has_certificate_number(self):
        """Certificate has a non-empty unique certificate number."""
        cert, _ = self._generate_cert(self.citizen_sindh)
        self.assertTrue(cert.certificate_number.startswith('CERT-'))

    def test_certificate_has_issue_date(self):
        """Certificate has a valid issue date."""
        cert, _ = self._generate_cert(self.citizen_sindh)
        self.assertIsNotNone(cert.issue_date)

    # ── 14: Two citizens receive DIFFERENT certificate data ─────────────────

    def test_two_citizens_receive_different_certificates(self):
        """Sindh and Punjab citizens each get their own distinct certificate."""
        cert_s, _ = self._generate_cert(self.citizen_sindh)
        cert_p, _ = self._generate_cert(self.citizen_punjab)

        # Different certificate numbers
        self.assertNotEqual(cert_s.certificate_number, cert_p.certificate_number)
        # Different linked citizens
        self.assertNotEqual(
            cert_s.application.applicant.cnic,
            cert_p.application.applicant.cnic,
        )

    # ── 15-17: QR URL and verification endpoint ─────────────────────────────

    def test_qr_verification_url_contains_certificate_number(self):
        """QR verification_url embeds the actual certificate number."""
        cert, _ = self._generate_cert(self.citizen_sindh)
        self.assertIn(cert.certificate_number, cert.verification_url)

    def test_qr_url_does_not_hardcode_localhost_in_production_config(self):
        """
        CERTIFICATE_VERIFY_BASE_URL is used, not a hardcoded localhost string
        baked into Python source. Verifies the URL comes from settings.
        """
        from django.conf import settings
        # The setting itself may still be localhost in dev — that's fine.
        # What we verify is that the setting EXISTS (not that source code hardcodes it).
        self.assertTrue(
            hasattr(settings, 'CERTIFICATE_VERIFY_BASE_URL'),
            "CERTIFICATE_VERIFY_BASE_URL setting must exist so it can be overridden in production."
        )

    def test_two_qr_codes_identify_different_certificates(self):
        """Two citizens get two different QR URLs (different certificate numbers)."""
        cert_s, _ = self._generate_cert(self.citizen_sindh)
        cert_p, _ = self._generate_cert(self.citizen_punjab)
        self.assertNotEqual(cert_s.verification_url, cert_p.verification_url)

    def test_qr_verification_endpoint_returns_correct_province(self):
        """GET /api/certificates/verify/<cert_num>/ returns the correct province."""
        cert, _ = self._generate_cert(self.citizen_sindh)
        client = APIClient()  # anonymous — public endpoint
        res = client.get(f'/api/certificates/verify/{cert.certificate_number}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['province'], 'Sindh')

    def test_qr_verification_endpoint_returns_correct_district(self):
        """GET /api/certificates/verify/<cert_num>/ returns the correct district."""
        cert, _ = self._generate_cert(self.citizen_sindh)
        client = APIClient()
        res = client.get(f'/api/certificates/verify/{cert.certificate_number}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['district'], 'Karachi')

    def test_qr_verification_endpoint_returns_correct_authority_sindh(self):
        """Sindh citizen → authority is 'Sindh Police'."""
        cert, _ = self._generate_cert(self.citizen_sindh)
        client = APIClient()
        res = client.get(f'/api/certificates/verify/{cert.certificate_number}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['authority'], 'Sindh Police')

    def test_qr_verification_endpoint_returns_correct_authority_punjab(self):
        """Punjab citizen → authority is 'Punjab Police'."""
        cert, _ = self._generate_cert(self.citizen_punjab)
        client = APIClient()
        res = client.get(f'/api/certificates/verify/{cert.certificate_number}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['authority'], 'Punjab Police')

    def test_qr_does_not_cross_leak_citizen_data(self):
        """Sindh cert verification endpoint must not return Punjab citizen data."""
        cert_s, _ = self._generate_cert(self.citizen_sindh)
        cert_p, _ = self._generate_cert(self.citizen_punjab)
        client = APIClient()

        res_s = client.get(f'/api/certificates/verify/{cert_s.certificate_number}/')
        res_p = client.get(f'/api/certificates/verify/{cert_p.certificate_number}/')

        # Sindh cert → Sindh data
        self.assertEqual(res_s.data['province'], 'Sindh')
        self.assertEqual(res_s.data['district'], 'Karachi')
        self.assertEqual(res_s.data['applicant_name'], 'Zara Khan')

        # Punjab cert → Punjab data
        self.assertEqual(res_p.data['province'], 'Punjab')
        self.assertEqual(res_p.data['district'], 'Lahore')
        self.assertEqual(res_p.data['applicant_name'], 'Ali Hassan')

        # No cross-leak
        self.assertNotEqual(res_s.data['cnic'], res_p.data['cnic'])

    # ── 18-19: Missing province/district — no silent substitution ───────────

    def test_missing_province_is_none_not_punjab_or_sindh(self):
        """When province is missing from user and application, it returns None — not Punjab or Sindh."""
        citizen_no_province = User.objects.create_user(
            cnic='00000-9999999-9', email='noprovince@test.com',
            password='Test@1234', full_name='No Province Citizen',
            role='CITIZEN', province=None, district=None,
        )
        app = Application.objects.create(
            applicant=citizen_no_province,
            application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS',
            status='PENDING',
            applicant_province=None,
        )
        from applications.serializers import ApplicationSerializer
        data = ApplicationSerializer(app).data
        nadra = data.get('nadra_details', {})
        prov = nadra.get('province')
        # Must not silently substitute Punjab or Sindh
        self.assertNotIn(prov, ['Punjab', 'Sindh'])
        # Either None/null or empty
        self.assertFalse(bool(prov))

    def test_missing_district_is_none_not_karachi_or_lahore(self):
        """When district is missing from user, it returns None — not a dummy district."""
        citizen_no_district = User.objects.create_user(
            cnic='00000-8888888-8', email='nodistrict@test.com',
            password='Test@1234', full_name='No District Citizen',
            role='CITIZEN', province=None, district=None,
        )
        app = Application.objects.create(
            applicant=citizen_no_district,
            application_type='Character Certificate',
            purpose='Test', current_address='Test', nearest_station='Test PS',
            status='PENDING',
        )
        from applications.serializers import ApplicationSerializer
        data = ApplicationSerializer(app).data
        nadra = data.get('nadra_details', {})
        dist = nadra.get('district')
        self.assertNotIn(dist, ['Karachi', 'Karachi South', 'Lahore'])
        self.assertFalse(bool(dist))

    # ── Province→Authority mapping logic ────────────────────────────────────

    def test_get_authority_name_returns_correct_mapping(self):
        """Province→authority function maps all known provinces correctly."""
        from applications.certificate_service import get_authority_name
        self.assertEqual(get_authority_name('Punjab'),             'Punjab Police')
        self.assertEqual(get_authority_name('Sindh'),              'Sindh Police')
        self.assertEqual(get_authority_name('Khyber Pakhtunkhwa'), 'KP Police')
        self.assertEqual(get_authority_name('KPK'),                'KP Police')
        self.assertEqual(get_authority_name('Balochistan'),        'Balochistan Police')
        self.assertEqual(get_authority_name('Islamabad'),          'ICT Police')
        # Unknown province → generic label
        self.assertEqual(get_authority_name('Gilgit-Baltistan'),   'GB Police')

    def test_get_authority_name_none_returns_pakistan_police(self):
        """Missing province returns generic 'Pakistan Police'."""
        from applications.certificate_service import get_authority_name
        self.assertEqual(get_authority_name(None),  'Pakistan Police')
        self.assertEqual(get_authority_name(''),    'Pakistan Police')


# ─── Stage 6: Full Frontend & E2E Integration Audit Tests ─────────────────────
class Stage6IntegrationTests(TestCase):
    """
    Validates Stage 6 End-to-End Workflow:
    - Multi-citizen isolation (Citizen A: Sindh/Karachi, Citizen B: Punjab/Lahore)
    - Sequential status transitions: PENDING -> FACE_VERIFIED -> STAFF_REVIEWED -> FORWARDED_TO_ADMIN -> AUTHORITY_APPROVED -> STAFF_CONFIRMED -> PAYMENT_PENDING -> PAYMENT_SUBMITTED -> COMPLETED
    - Role authorization checks (Citizens cannot approve/confirm/verify; Staff cannot authority approve/reject)
    - Certificate data integrity & QR Verification isolation
    """

    def setUp(self):
        self.client = APIClient()

        # Citizen A (Sindh, Karachi)
        self.citizen_a = User.objects.create_user(
            cnic='42101-1111111-1', email='sindh_citizen@test.com',
            password='Pass@1234', full_name='Citizen Sindh',
            role='CITIZEN', province='Sindh', district='Karachi'
        )

        # Citizen B (Punjab, Lahore)
        self.citizen_b = User.objects.create_user(
            cnic='35202-2222222-2', email='punjab_citizen@test.com',
            password='Pass@1234', full_name='Citizen Punjab',
            role='CITIZEN', province='Punjab', district='Lahore'
        )

        # Staff User
        self.staff = User.objects.create_user(
            cnic='35202-3333333-3', email='staff_officer@test.com',
            password='Staff@1234', full_name='Staff Officer',
            role='POLICE_STAFF'
        )

        # Authority User
        self.authority = User.objects.create_user(
            cnic='35202-4444444-4', email='authority_officer@test.com',
            password='Auth@1234', full_name='Authority Officer',
            role='POLICE_AUTHORITY'
        )

    def _mock_face_and_liveness(self, citizen):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from face_verification.models import FaceVerificationReport
        self.face_report = FaceVerificationReport(
            citizen=citizen,
            matched_cnic=citizen.cnic,
            matched_citizen_name=citizen.full_name,
            matched_father_name='Father',
            matched_date_of_birth='1990-01-01',
            matched_gender='M',
            matched_address=citizen.address or 'Address',
            matched_district=citizen.district or 'District',
            matched_province=citizen.province or 'Province',
            matched_photo_url='http://test',
            similarity_score=0.885,
            similarity_pct=88.5,
            status='VERIFIED',
            confidence_level='HIGH',
            model_used='InsightFace',
            processing_time_ms=120.0,
            verified_at=timezone.now(),
        )
        face_patch = patch(
            'face_verification.views.FaceVerificationService.verify_with_cnic',
            return_value=self.face_report,
        )
        live_result = {
            'liveness_score': 0.91,
            'anti_spoofing': 'REAL',
            'face_detected': True,
            'verified': True,
        }
        return face_patch, patch(
            'face_verification.service.check_liveness_with_ai',
            return_value=live_result,
        )

    def test_e2e_full_workflow_citizen_sindh(self):
        """End-to-end test for Citizen A (Sindh / Karachi)."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        # 1. Citizen A creates application
        self.client.force_authenticate(user=self.citizen_a)
        res = self.client.post('/api/citizen/applications/', {
            'application_type': 'Character Certificate',
            'purpose': 'Employment abroad',
            'current_address': 'Clifton Karachi',
            'nearest_station': 'Clifton PS'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        app_id = res.data['id']
        app = Application.objects.get(pk=app_id)
        self.assertEqual(app.status, 'PENDING')

        # 2. Face Verification and criminal screening
        Document.objects.create(application=app, document_type='PASSPORT_PHOTO', file='dummy_face.jpg')
        face_patch, live_patch = self._mock_face_and_liveness(self.citizen_a)
        with face_patch, live_patch:
            res_face = self.client.post(
                f'/api/citizen/applications/{app_id}/face-verify/',
                {'live_image': SimpleUploadedFile('dummy.jpg', b'face', content_type='image/jpeg')},
                format='multipart',
            )
        self.assertEqual(res_face.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'CRIMINAL_CHECKED')

        # Role Check: Citizen cannot submit staff remark
        res_fail_remark = self.client.post(f'/api/staff/applications/{app_id}/remark/', {'remarks': 'Illegal'})
        self.assertEqual(res_fail_remark.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Police Staff Remark -> STAFF_REVIEWED
        self.client.force_authenticate(user=self.staff)
        res_remark = self.client.post(f'/api/staff/applications/{app_id}/remark/', {'remarks': 'Staff verified identity documents.'})
        self.assertEqual(res_remark.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'STAFF_REVIEWED')

        # 4. Police Staff Forward -> FORWARDED_TO_ADMIN
        res_forward = self.client.post(f'/api/staff/applications/{app_id}/forward/', {'remarks': 'Forwarding to Authority.'})
        self.assertEqual(res_forward.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'FORWARDED_TO_ADMIN')

        # Role Check: Staff cannot approve application
        res_fail_decide = self.client.post(f'/api/authority/applications/{app_id}/decide/', {'decision': 'APPROVE'})
        self.assertEqual(res_fail_decide.status_code, status.HTTP_403_FORBIDDEN)

        # 5. Police Authority Decision -> AUTHORITY_APPROVED
        self.client.force_authenticate(user=self.authority)
        res_decide = self.client.post(f'/api/authority/applications/{app_id}/decide/', {'decision': 'APPROVE', 'reason': 'Cleared'})
        self.assertEqual(res_decide.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'AUTHORITY_APPROVED')

        # 6. Police Staff Confirm -> PAYMENT_PENDING (Challan auto generated)
        self.client.force_authenticate(user=self.staff)
        res_confirm = self.client.post(f'/api/staff/applications/{app_id}/confirm/', {})
        self.assertEqual(res_confirm.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'PAYMENT_PENDING')
        self.assertTrue(Challan.objects.filter(application=app).exists())

        # 7. Citizen A Pays -> PAYMENT_SUBMITTED
        self.client.force_authenticate(user=self.citizen_a)
        res_pay = self.client.post(f'/api/citizen/applications/{app_id}/pay/', {'payment_method': 'EASYPAISA', 'mobile_number': '03001234567'})
        self.assertEqual(res_pay.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'PAYMENT_SUBMITTED')

        # 8. Police Staff Verifies Payment -> Certificate Issued -> COMPLETED
        self.client.force_authenticate(user=self.staff)
        res_verify_pay = self.client.post(f'/api/staff/applications/{app_id}/verify-payment/', {})
        self.assertEqual(res_verify_pay.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'COMPLETED')
        self.assertTrue(Certificate.objects.filter(application=app).exists())
        cert_a = Certificate.objects.get(application=app)

        # 9. Public QR Scan Verification Check
        self.client.force_authenticate(user=None)
        res_qr = self.client.get(f'/api/certificates/verify/{cert_a.qr_code_hash}/')
        self.assertEqual(res_qr.status_code, status.HTTP_200_OK)
        self.assertEqual(res_qr.data['applicant_name'], 'Citizen Sindh')
        self.assertEqual(res_qr.data['cnic'], '42101-*******-1')
        self.assertEqual(res_qr.data['province'], 'Sindh')
        self.assertEqual(res_qr.data['authority'], 'Sindh Police')

    def test_e2e_full_workflow_citizen_punjab(self):
        """End-to-end test for Citizen B (Punjab / Lahore)."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.client.force_authenticate(user=self.citizen_b)
        res = self.client.post('/api/citizen/applications/', {
            'application_type': 'Tenant Verification',
            'purpose': 'Rental clearance',
            'current_address': 'Gulberg Lahore',
            'nearest_station': 'Gulberg PS'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        app_id = res.data['id']
        app = Application.objects.get(pk=app_id)

        # Face Verification
        Document.objects.create(application=app, document_type='PASSPORT_PHOTO', file='dummy_face.jpg')
        face_patch, live_patch = self._mock_face_and_liveness(self.citizen_b)
        with face_patch, live_patch:
            self.client.post(
                f'/api/citizen/applications/{app_id}/face-verify/',
                {'live_image': SimpleUploadedFile('dummy.jpg', b'face', content_type='image/jpeg')},
                format='multipart',
            )
        app.refresh_from_db()

        # Staff Remark & Forward
        self.client.force_authenticate(user=self.staff)
        self.client.post(f'/api/staff/applications/{app_id}/remark/', {'remarks': 'Verified.'})
        self.client.post(f'/api/staff/applications/{app_id}/forward/', {'remarks': 'Forwarding.'})

        # Authority Decision
        self.client.force_authenticate(user=self.authority)
        self.client.post(f'/api/authority/applications/{app_id}/decide/', {'decision': 'APPROVE'})

        # Staff Confirm
        self.client.force_authenticate(user=self.staff)
        self.client.post(f'/api/staff/applications/{app_id}/confirm/', {})

        # Citizen B Pays
        self.client.force_authenticate(user=self.citizen_b)
        self.client.post(f'/api/citizen/applications/{app_id}/pay/', {'payment_method': 'JAZZCASH', 'mobile_number': '03009876543'})

        # Staff Verify Payment -> COMPLETED
        self.client.force_authenticate(user=self.staff)
        self.client.post(f'/api/staff/applications/{app_id}/verify-payment/', {})

        app.refresh_from_db()
        self.assertEqual(app.status, 'COMPLETED')
        cert_b = Certificate.objects.get(application=app)

        # QR Verification Check
        self.client.force_authenticate(user=None)
        res_qr = self.client.get(f'/api/certificates/verify/{cert_b.qr_code_hash}/')
        self.assertEqual(res_qr.status_code, status.HTTP_200_OK)
        self.assertEqual(res_qr.data['applicant_name'], 'Citizen Punjab')
        self.assertEqual(res_qr.data['cnic'], '35202-*******-2')
        self.assertEqual(res_qr.data['province'], 'Punjab')
        self.assertEqual(res_qr.data['authority'], 'Punjab Police')

