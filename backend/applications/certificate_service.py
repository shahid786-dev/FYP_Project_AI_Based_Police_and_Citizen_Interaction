import os
import io
import uuid
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image
import qrcode
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from applications.models import Certificate
from blockchain.service import BlockchainService


# Template coordinates use pixels from the top-left of the 816x1306 artwork.
CERTIFICATE_LAYOUT = {
    'template_dpi': 100,
    'font_name': 'Helvetica',
    'font_bold_name': 'Helvetica-Bold',
    'font_size': 11.5,
    'minimum_font_size': 7.5,
    'fields': {
        'name': {'x': 330, 'baseline_y': 393, 'max_width': 440},
        'father_name': {'x': 136, 'baseline_y': 443, 'max_width': 633},
        'cnic': {'x': 219, 'baseline_y': 493, 'max_width': 309},
        'district': {'x': 233, 'baseline_y': 542, 'max_width': 198},
        'province': {'x': 592, 'baseline_y': 542, 'max_width': 177},
        'certificate_no': {
            'x': 215, 'baseline_y': 810, 'max_width': 194, 'align': 'center',
        },
        'issue_date': {
            'x': 215, 'baseline_y': 860, 'max_width': 194, 'align': 'center',
        },
        'valid_until': {
            'x': 215, 'baseline_y': 910, 'max_width': 194, 'align': 'center',
        },
        'status': {
            'x': 261, 'baseline_y': 958, 'max_width': 149,
            'align': 'center', 'bold': True,
        },
    },
    'qr': {
        'frame': {'x': 33, 'y': 1028, 'size': 183},
        'x': 43,
        'y': 1038,
        'size': 163,
        'quiet_zone_modules': 4,
        'label': {'center_x': 124.5, 'baseline_y': 1250},
    },
}


def draw_fitted_text(pdf, value, field, page_height, scale, bold=False):
    """Draw one value at a fixed baseline, shrinking it to stay in its field."""
    text = str(value or '')
    if not text:
        return

    font_name = CERTIFICATE_LAYOUT['font_bold_name'] if bold else CERTIFICATE_LAYOUT['font_name']
    font_size = CERTIFICATE_LAYOUT['font_size']
    max_width = field['max_width'] * scale
    while (
        font_size > CERTIFICATE_LAYOUT['minimum_font_size']
        and pdf.stringWidth(text, font_name, font_size) > max_width
    ):
        font_size = round(font_size - 0.25, 2)

    if pdf.stringWidth(text, font_name, font_size) > max_width:
        while text and pdf.stringWidth(f'{text}...', font_name, font_size) > max_width:
            text = text[:-1]
        text = f'{text}...' if text else ''
    if not text:
        return

    x = field['x'] * scale
    if field.get('align') == 'center':
        x += (max_width - pdf.stringWidth(text, font_name, font_size)) / 2
    y = page_height - field['baseline_y'] * scale
    pdf.setFont(font_name, font_size)
    pdf.setFillColorRGB(0.0, 0.0, 0.0)
    if bold:
        pdf.setFillColorRGB(0.13, 0.55, 0.13)
    pdf.drawString(x, y, text)


def _generate_verification_qr_png(verification_url):
    qr_layout = CERTIFICATE_LAYOUT['qr']
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=qr_layout['quiet_zone_modules'],
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color='black', back_color='white').get_image().convert('RGB')
    qr_buffer = io.BytesIO()
    qr_image.save(qr_buffer, format='PNG')
    return qr_buffer.getvalue()


def render_certificate_pdf(template_path, values, verification_url):
    """Compose dynamic values and a QR over the original fixed-size template."""
    with Image.open(template_path) as template:
        template_width, template_height = template.size

    scale = 72.0 / CERTIFICATE_LAYOUT['template_dpi']
    page_width = template_width * scale
    page_height = template_height * scale
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=(page_width, page_height))
    pdf.drawImage(
        template_path, 0, 0, width=page_width, height=page_height,
        preserveAspectRatio=False,
    )

    for key, field in CERTIFICATE_LAYOUT['fields'].items():
        draw_fitted_text(
            pdf, values.get(key), field, page_height, scale,
            bold=field.get('bold', False),
        )

    qr_layout = CERTIFICATE_LAYOUT['qr']
    qr_buffer = io.BytesIO(_generate_verification_qr_png(verification_url))
    qr_size = qr_layout['size'] * scale
    qr_x = qr_layout['x'] * scale
    qr_y = page_height - (qr_layout['y'] + qr_layout['size']) * scale
    pdf.drawImage(
        ImageReader(qr_buffer), qr_x, qr_y, width=qr_size, height=qr_size,
        preserveAspectRatio=True, mask='auto',
    )
    pdf.showPage()
    pdf.save()
    return output.getvalue()

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
        verification_url = f"{base_url}/verify/{cert.certificate_number}"
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
        pdf_bytes = render_certificate_pdf(
            template_path,
            {
                'name': citizen.full_name,
                'father_name': citizen.father_name,
                'cnic': citizen.cnic,
                'district': district,
                'province': province,
                'certificate_no': cert.certificate_number,
                'issue_date': cert.issue_date,
                'valid_until': cert.validity_expiry,
                'status': 'VERIFIED',
            },
            verification_url,
        )

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
