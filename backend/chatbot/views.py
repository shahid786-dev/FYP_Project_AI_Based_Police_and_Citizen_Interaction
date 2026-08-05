from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import FaqKnowledge
import os

FAQ_DATA = [
    {"q": "how to apply", "a": "Login to your Citizen Portal → click 'New Request' → choose your certificate type → upload CNIC + photo → submit. Processing takes 3-7 working days."},
    {"q": "character certificate", "a": "A Character Certificate confirms you have no criminal record. It is required for jobs, visa applications, and government purposes."},
    {"q": "documents required", "a": "You need: (1) Original CNIC Front & Back, (2) Recent passport-size photo, (3) Proof of address (utility bill), (4) Any supporting documents."},
    {"q": "how long", "a": "Standard verification takes 3-5 working days after payment. Urgent processing is available within 24-48 hours for an additional fee."},
    {"q": "track application", "a": "Go to 'Track Application', enter your Tracking ID (received via SMS/Email after submission) to see real-time status updates."},
    {"q": "payment", "a": "We accept JazzCash, EasyPaisa, Credit/Debit Cards (Visa, Mastercard), and Bank Transfer. All payments are 100% secure and SSL encrypted."},
    {"q": "fee", "a": "The total fee is PKR 650: Application Fee PKR 500 + AI Verification PKR 100 + Processing PKR 50."},
    {"q": "tenant verification", "a": "For tenant verification, the landlord submits the tenant's CNIC. The police will verify the tenant's background within 3-5 days."},
    {"q": "rejected", "a": "If rejected, you will receive an SMS/email with the reason. Common reasons: mismatched face scan, criminal record found, or incomplete documents."},
    {"q": "qr code", "a": "The QR code on your certificate can be scanned by any employer, embassy, or institution to instantly verify its authenticity online."},
    {"q": "contact", "a": "For assistance, call our 24/7 helpline at 0800-12345 or email support@pakverify.gov.pk"},
    {"q": "cnic", "a": "Your CNIC (Computerized National Identity Card) is your primary identification. Format: XXXXX-XXXXXXX-X (13 digits)."},
    {"q": "police clearance", "a": "Police Clearance Certificate (PCC) is needed for international travel, immigration, or overseas employment. Apply under 'Passport Police Clearance'."},
    {"q": "otp", "a": "OTP (One-Time Password) is a 6-digit code sent to your registered mobile for security verification. It is valid for 10 minutes."},
    {"q": "face verification", "a": "AI face verification compares your live selfie with your CNIC photo using biometric algorithms. Ensure good lighting and hold still."},
]

def get_faq_answer(query: str) -> str:
    query_lower = query.lower()
    best_match = None
    best_score = 0

    # First try database FAQ
    db_faqs = FaqKnowledge.objects.all()
    for faq in db_faqs:
        words = faq.question.lower().split()
        score = sum(1 for word in words if word in query_lower)
        if score > best_score:
            best_score = score
            best_match = faq.answer

    # Then try static FAQ
    for faq in FAQ_DATA:
        words = faq["q"].lower().split()
        score = sum(1 for word in words if word in query_lower)
        if score > best_score:
            best_score = score
            best_match = faq["a"]

    if best_match and best_score > 0:
        return best_match

    return ("I understand your query about Pakistani Police Verification. For detailed assistance, "
            "please call our helpline: 0800-12345 or email support@pakverify.gov.pk. "
            "Our agents are available 24/7 in English and Urdu.")


class ChatbotView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Try OpenAI API if key exists
        openai_key = os.environ.get('OPENAI_API_KEY')
        if openai_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=openai_key)

                system_prompt = """You are PakVerify AI Assistant, an intelligent chatbot for the Pakistani Police Verification Portal.
Your purpose is to help citizens with:
- Police verification certificate applications
- Required documents
- Payment methods (JazzCash, EasyPaisa, Card, Bank Transfer)
- Application tracking
- Face verification process
- Certificate downloads
Keep answers concise, helpful, and relevant to Pakistani government services.
Respond in English but greet in Urdu if appropriate."""

                completion = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    max_tokens=300,
                    temperature=0.7
                )
                reply = completion.choices[0].message.content
                return Response({'reply': reply, 'source': 'openai'}, status=status.HTTP_200_OK)
            except Exception as e:
                print(f"OpenAI API Error: {e}")
                # Fall through to local FAQ

        # Local RAG-based FAQ response
        reply = get_faq_answer(user_message)
        return Response({'reply': reply, 'source': 'faq'}, status=status.HTTP_200_OK)
