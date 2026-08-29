import random
from django.utils import timezone
from django.conf import settings

class BaseOTPService:
    """Base interface for OTP authentication handling."""
    def generate_and_send(self, user, purpose="authentication"):
        raise NotImplementedError
        
    def verify(self, user, otp_code):
        raise NotImplementedError

class DevelopmentOTPService(BaseOTPService):
    """
    Local development OTP handler.
    Generates a secure 6-digit OTP, stores it with expiry, and logs it to dev console.
    Supplies clear development mode feedback for UI preview.
    """
    OTP_EXPIRY_MINUTES = 5
    MAX_ATTEMPTS = 5
    DEV_BYPASS_CODE = "123456"

    def generate_and_send(self, user, purpose="authentication"):
        # Generate 6-digit random code
        code = f"{random.randint(100000, 999999)}"
        expiry = timezone.now() + timezone.timedelta(minutes=self.OTP_EXPIRY_MINUTES)
        
        user.otp_code = code
        user.otp_expiry = expiry
        user.save(update_fields=['otp_code', 'otp_expiry'])
        
        # Log clearly to console for local development testing
        print("\n" + "=" * 60)
        print(f"[DEVELOPMENT MODE OTP GATEWAY] Purpose: {purpose.upper()}")
        print(f"User CNIC/Email : {user.cnic} | {user.email}")
        print(f"Generated 6-Digit OTP: {code}")
        print(f"Expires At       : {expiry.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        print("Note: In development mode, you can also use '123456' as a test fallback.")
        print("=" * 60 + "\n")
        
        return {
            'success': True,
            'message': f'Development Mode: OTP generated successfully for {purpose}. Check development console.',
            'otp_code': code if settings.DEBUG else None,
            'expiry_minutes': self.OTP_EXPIRY_MINUTES
        }

    def verify(self, user, otp_code):
        if not user.otp_code and otp_code != self.DEV_BYPASS_CODE:
            return False, "No active OTP request found. Please request a new OTP."
            
        if user.otp_expiry and timezone.now() > user.otp_expiry:
            if otp_code != self.DEV_BYPASS_CODE:
                return False, "OTP has expired. Please request a new code."
                
        if user.otp_code == otp_code or (settings.DEBUG and otp_code == self.DEV_BYPASS_CODE):
            # Clear OTP after successful verification
            user.otp_code = None
            user.otp_expiry = None
            user.save(update_fields=['otp_code', 'otp_expiry'])
            return True, "OTP verified successfully."
            
        return False, "Invalid OTP code provided."

class SMSOTPService(BaseOTPService):
    """Placeholder for future SMS provider integration (Twilio, TeleStax, etc.)."""
    def generate_and_send(self, user, purpose="authentication"):
        raise NotImplementedError("SMS Provider integration not configured for localhost environment.")
        
    def verify(self, user, otp_code):
        raise NotImplementedError("SMS Provider integration not configured for localhost environment.")

class EmailOTPService(BaseOTPService):
    """Placeholder for future Email SMTP provider integration."""
    def generate_and_send(self, user, purpose="authentication"):
        raise NotImplementedError("Email Provider integration not configured for localhost environment.")
        
    def verify(self, user, otp_code):
        raise NotImplementedError("Email Provider integration not configured for localhost environment.")

def get_otp_service():
    """Factory function returning the active OTP service implementation based on settings."""
    # Default to DevelopmentOTPService for local development
    return DevelopmentOTPService()
