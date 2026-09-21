import os
import io
import uuid
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageDraw, ImageFont
import qrcode
from applications.models import Certificate
from blockchain.service import BlockchainService

# ── Province → Police Authority mapping ──────────────────────────────────────
PROVINCE_AUTHORITY_MAP = {
    'Punjab':               'Punjab Police',
    'Sindh':                'Sindh Police',
    'Khyber Pakhtunkhwa':   'KP Police',
    'KPK':                  'KP Police',
    'KP':                   'KP Police',
    'Balochistan':          'Balochistan Police',
    'Azad Kashmir':         'AJK Police',
    'AJK':                  'AJK Police',
    'Gilgit-Baltistan':     'GB Police',
    'GB':                   'GB Police',
    'Islamabad':            'ICT Police',
    'Federal':              'Federal Police',
}


def get_authority_name(province: str) -> str:
    """Return the police authority name for a given province string."""
    if not province:
        return 'Pakistan Police'
    # Try exact match first, then case-insensitive
    return PROVINCE_AUTHORITY_MAP.get(
        province,
        PROVINCE_AUTHORITY_MAP.get(province.title(), f'{province} Police')
    )


class CertificateService:
    """
    ONE authoritative certificate-generation service.
    All certificate creation MUST go through this class.
    """

    @staticmethod
    def generate_certificate(application):
        """
        Generate a police verification certificate for the given application.

        Idempotent: if a certificate already exists, returns the existing one
        without creating duplicates (no duplicate cert number, QR, or blockchain record).

        Valid pre-generation statuses: PAYMENT_VERIFIED, PAYMENT_CONFIRMED.
        """
        # ── Idempotency: return existing certificate if already issued ────────
        try:
            existing_cert = application.certificate
            # Certificate already exists — do NOT create another.
            # Ensure application is marked COMPLETED (may have been interrupted).
            if application.status != 'COMPLETED':
                application.status = 'COMPLETED'
                application.save()
            return existing_cert
        except Certificate.DoesNotExist:
            pass

        # ── Validate application status ───────────────────────────────────────
        ELIGIBLE_STATUSES = ('PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED')
        if application.status not in ELIGIBLE_STATUSES:
            raise ValueError(
                f"Certificate cannot be generated for application in status "
                f"'{application.status}'. Required: one of {ELIGIBLE_STATUSES}."
            )

        # Transition to PAYMENT_CONFIRMED (the canonical pre-cert status)
        if application.status != 'PAYMENT_CONFIRMED':
            application.status = 'PAYMENT_CONFIRMED'
            application.save()

        # ── Retrieve citizen data from the database ────────────────────────────
        citizen = application.applicant

        # Province/district: prefer applicant_province (snapshot at application time),
        # fall back to citizen.province / citizen.district. NEVER hardcode.
        province = (
            application.applicant_province
            or getattr(citizen, 'province', None)
            or ''
        )
        district = getattr(citizen, 'district', None) or ''

        # ── Create Certificate record ─────────────────────────────────────────
        sig_uuid = str(uuid.uuid4())

        cert = Certificate(
            application=application,
            validity_expiry=timezone.now().date() + timedelta(
                days=getattr(settings, 'CERTIFICATE_VALIDITY_DAYS', 180)
            ),
            qr_code_hash=sig_uuid,
            digital_signature=f"PKV-SIG-{sig_uuid[:18].upper()}",
            verification_url="",
            status='VALID',
        )
        # Save first to generate certificate_number
        cert.save()

        # ── Build verification URL (env-configurable, no hardcoded localhost) ─
        base_url = getattr(
            settings, 'CERTIFICATE_VERIFY_BASE_URL',
            getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        )
        # Strip trailing slash for clean URL
        base_url = base_url.rstrip('/')
        verification_url = f"{base_url}/verify/certificate/{cert.certificate_number}"
        cert.verification_url = verification_url
        cert.save()

        # ── Load certificate template ─────────────────────────────────────────
        # Primary: the JFIF template in certificates/templates/
        template_path = os.path.join(
            settings.BASE_DIR.parent, 'certificates', 'templates', 'Certificate_Template.jfif'
        )
        # Fallback: old path (PNG in src/assets) for backward compatibility
        if not os.path.exists(template_path):
            template_path = os.path.join(
                settings.BASE_DIR.parent, 'src', 'assets', 'Police verification Certificate.png'
            )
        if not os.path.exists(template_path):
            raise FileNotFoundError(
                f"Certificate template not found. Tried:\n"
                f"  {os.path.join(settings.BASE_DIR.parent, 'certificates', 'templates', 'Certificate_Template.jfif')}\n"
                f"  {os.path.join(settings.BASE_DIR.parent, 'src', 'assets', 'Police verification Certificate.png')}"
            )

        img = Image.open(template_path).convert('RGB')
        draw = ImageDraw.Draw(img)

        # ── Load font ─────────────────────────────────────────────────────────
        try:
            font_path = os.path.join(settings.BASE_DIR, 'assets', 'fonts', 'Roboto-Regular.ttf')
            font      = ImageFont.truetype(font_path, 22)
            font_bold = ImageFont.truetype(font_path, 24)
        except (IOError, OSError):
            font      = ImageFont.load_default()
            font_bold = font

        # ── Coordinates (verified against 816×1306 template) ─────────────────
        coords = getattr(settings, 'CERTIFICATE_COORDINATES', {
            'NAME':        (330, 388),
            'FATHER_NAME': (130, 435),
            'CNIC':        (220, 482),
            'DISTRICT':    (240, 530),
            'PROVINCE':    (605, 530),
            'CERT_NUM':    (215, 808),
            'ISSUE_DATE':  (185, 855),
            'EXPIRY_DATE': (185, 903),
            'STATUS':      (265, 952),
            'QR_CODE':     (30,  1040),
            'QR_SIZE':     175,
        })

        color       = (0, 0, 0)        # black text
        green_color = (34, 139, 34)    # green for status

        # ── Draw fields from database — NO hardcoded citizen values ───────────
        draw.text(coords['NAME'],        citizen.full_name,                   fill=color, font=font_bold)
        draw.text(coords['FATHER_NAME'], citizen.father_name or '',           fill=color, font=font)
        draw.text(coords['CNIC'],        citizen.cnic,                        fill=color, font=font)
        draw.text(coords['DISTRICT'],    district,                            fill=color, font=font)
        draw.text(coords['PROVINCE'],    province,                            fill=color, font=font)
        draw.text(coords['CERT_NUM'],    cert.certificate_number,             fill=color, font=font)
        draw.text(coords['ISSUE_DATE'],  str(cert.issue_date),                fill=color, font=font)
        draw.text(coords['EXPIRY_DATE'], str(cert.validity_expiry),           fill=color, font=font)
        draw.text(coords['STATUS'],      'VERIFIED — CLEAR',                  fill=green_color, font=font_bold)

        # ── Generate QR code embedding the verification URL ───────────────────
        qr = qrcode.QRCode(version=1, box_size=4, border=1)
        qr.add_data(verification_url)
        qr.make(fit=True)
        qr_img  = qr.make_image(fill_color='black', back_color='white')
        qr_size = coords.get('QR_SIZE', 175)
        qr_img  = qr_img.resize((qr_size, qr_size))
        img.paste(qr_img, coords['QR_CODE'])

        # ── Save the final certificate as PDF ─────────────────────────────────
        buf       = io.BytesIO()
        img.save(buf, format='PDF', resolution=100.0, save_all=True)
        pdf_bytes = buf.getvalue()

        # ── SHA-256 hash ───────────────────────────────────────────────────────
        cert_hash            = hashlib.sha256(pdf_bytes).hexdigest()
        cert.certificate_hash = cert_hash

        # ── Save PDF to model ──────────────────────────────────────────────────
        cert.pdf_file.save(
            f"PakVerify_Cert_{cert.certificate_number}.pdf",
            ContentFile(pdf_bytes),
            save=False,
        )

        # ── Blockchain record ──────────────────────────────────────────────────
        bc_block = BlockchainService.add_block(
            'CERTIFICATE_ISSUE', str(application.id), citizen.cnic,
            {
                'certificate_number': cert.certificate_number,
                'tracking_id':        application.tracking_id,
                'certificate_hash':   cert_hash,
            }
        )

        if bc_block:
            cert.blockchain_transaction_hash = bc_block.current_hash

        cert.save()

        application.status = 'COMPLETED'
        application.save()

        return cert
