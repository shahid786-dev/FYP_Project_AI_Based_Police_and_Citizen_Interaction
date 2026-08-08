import os
import io
import uuid
import hashlib
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageDraw, ImageFont
import qrcode
from applications.models import Certificate
from blockchain.service import BlockchainService

class CertificateService:
    @staticmethod
    def generate_certificate(application):
        # 1. Validate application status
        if application.status != 'PAYMENT_CONFIRMED':
            raise ValueError("Certificate cannot be generated until all verification and approval requirements are completed.")
            
        if hasattr(application, 'certificate'):
            raise ValueError("Certificate already generated for this application.")
            
        # 2. Retrieve citizen data
        citizen = application.applicant
        
        # 4. Generate certificate number
        # 5. Generate QR code
        sig_uuid = str(uuid.uuid4())
        # verification_url will be set after cert is saved to have certificate_number
        
        cert = Certificate(
            application=application,
            validity_expiry=timezone.now().date() + timedelta(days=getattr(settings, 'CERTIFICATE_VALIDITY_DAYS', 180)),
            qr_code_hash=sig_uuid,
            digital_signature=f"PKV-SIG-{sig_uuid[:18].upper()}",
            verification_url="",
            status='VALID',
        )
        # Save to get the generated certificate_number
        cert.save()

        verification_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/verify/certificate/{cert.certificate_number}"
        cert.verification_url = verification_url
        cert.save()

        # 6. Load template and draw text
        template_path = os.path.join(settings.BASE_DIR.parent, 'src', 'assets', 'Police verification Certificate.png')
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template not found at {template_path}")
            
        img = Image.open(template_path).convert('RGB')
        draw = ImageDraw.Draw(img)
        
        # Load a default font or a custom one if available
        try:
            # Try to load a TTF font if available
            font_path = os.path.join(settings.BASE_DIR, 'assets', 'fonts', 'Roboto-Regular.ttf')
            font = ImageFont.truetype(font_path, 20)
            font_bold = ImageFont.truetype(font_path, 24)
        except IOError:
            font = ImageFont.load_default()
            font_bold = font

        # Coordinates configuration from settings
        coords = getattr(settings, 'CERTIFICATE_COORDINATES', {
            'NAME': (250, 420),
            'FATHER_NAME': (250, 460),
            'CNIC': (250, 500),
            'DOB': (250, 540),
            'CERT_NUM': (250, 580),
            'ISSUE_DATE': (250, 620),
            'EXPIRY_DATE': (250, 660),
            'STATUS': (250, 700),
            'QR_CODE': (200, 780),
            'QR_SIZE': 150
        })

        color = (0, 0, 0)
        
        # Draw texts
        draw.text(coords['NAME'], f"{citizen.full_name}", fill=color, font=font_bold)
        draw.text(coords['FATHER_NAME'], f"{citizen.father_name or 'N/A'}", fill=color, font=font)
        draw.text(coords['CNIC'], f"{citizen.cnic}", fill=color, font=font)
        draw.text(coords['DOB'], f"{citizen.dob or 'N/A'}", fill=color, font=font)
        draw.text(coords['CERT_NUM'], f"{cert.certificate_number}", fill=color, font=font)
        draw.text(coords['ISSUE_DATE'], f"{cert.issue_date}", fill=color, font=font)
        draw.text(coords['EXPIRY_DATE'], f"{cert.validity_expiry}", fill=color, font=font)
        
        # Status text with Academic disclaimer
        status_text = "VERIFIED - CLEAR (ACADEMIC DEMONSTRATION ONLY)"
        draw.text(coords['STATUS'], status_text, fill=(34, 139, 34), font=font_bold)
        
        # Add a big disclaimer at the bottom
        disclaimer = "FOR ACADEMIC DEMONSTRATION ONLY — NOT AN OFFICIAL GOVERNMENT DOCUMENT"
        # draw centered at the bottom
        draw.text((100, img.height - 40), disclaimer, fill=(255, 0, 0), font=font)

        # 7. Generate QR code
        qr = qrcode.QRCode(version=1, box_size=4, border=1)
        qr.add_data(verification_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_img = qr_img.resize((coords['QR_SIZE'], coords['QR_SIZE']))
        
        # Paste QR code onto the template
        img.paste(qr_img, coords['QR_CODE'])

        # 8. Save the final certificate as PDF
        buf = io.BytesIO()
        img.save(buf, format='PDF', resolution=100.0, save_all=True)
        pdf_bytes = buf.getvalue()
        
        # 9. Calculate SHA-256 hash
        cert_hash = hashlib.sha256(pdf_bytes).hexdigest()
        cert.certificate_hash = cert_hash
        
        # Save file to model
        cert.pdf_file.save(f"PakVerify_Cert_{cert.certificate_number}.pdf", ContentFile(pdf_bytes), save=False)
        
        # 11. Call blockchain service
        bc_block = BlockchainService.add_block(
            'CERTIFICATE_ISSUE', str(application.id), citizen.cnic,
            {
                'certificate_number': cert.certificate_number,
                'tracking_id': application.tracking_id,
                'certificate_hash': cert_hash
            }
        )
        
        # 12. Update certificate record
        if bc_block:
            cert.blockchain_transaction_hash = bc_block.current_hash
        
        cert.save()
        
        application.status = 'COMPLETED'
        application.save()
        
        return cert
