"""
Notification Service
====================
Central service for creating notifications and simulating email sends.
Import notify() from any view or service.
"""

from .models import Notification


def notify(recipient, notif_type: str, title: str, message: str, reference_id: str = ''):
    """
    Create an in-app notification and simulate an email send (console output).

    Parameters
    ----------
    recipient    : User instance
    notif_type   : one of Notification.NOTIF_TYPES keys
    title        : short notification title
    message      : full notification body
    reference_id : tracking ID or other reference string (optional)
    """
    notif = Notification.objects.create(
        recipient=recipient,
        notif_type=notif_type,
        title=title,
        message=message,
        reference_id=reference_id,
    )

    # ── Simulated Email (console print) ────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"📧 EMAIL NOTIFICATION")
    print(f"To:      {recipient.email}")
    print(f"Subject: {title}")
    print(f"Body:    {message}")
    if reference_id:
        print(f"Ref ID:  {reference_id}")
    print(f"{'='*60}\n")

    return notif


# ── Convenience wrappers for each workflow event ───────────────────────────

def notify_application_submitted(citizen, tracking_id):
    notify(
        citizen, 'APPLICATION_SUBMITTED',
        'Application Submitted Successfully',
        f"Your police verification application (ID: {tracking_id}) has been submitted and is under review.",
        tracking_id,
    )


def notify_ai_verified(citizen, tracking_id, confidence):
    notify(
        citizen, 'AI_VERIFIED',
        'AI Identity Verification Complete',
        f"Your live face verification for application {tracking_id} is complete. "
        f"Confidence score: {confidence}%.",
        tracking_id,
    )


def notify_nadra_verified(citizen, tracking_id, result):
    notify(
        citizen, 'NADRA_VERIFIED',
        'NADRA Identity Check Complete',
        f"Your NADRA identity check for application {tracking_id} result: {result}.",
        tracking_id,
    )


def notify_criminal_checked(citizen, tracking_id, result):
    notify(
        citizen, 'CRIMINAL_CHECKED',
        'Criminal Record Check Complete',
        f"Background / criminal record check for application {tracking_id} result: {result}.",
        tracking_id,
    )


def notify_staff_reviewed(citizen, tracking_id, remarks):
    notify(
        citizen, 'STAFF_REVIEWED',
        'Police Staff Review Complete',
        f"Police staff has reviewed your application {tracking_id}. Remarks: {remarks}.",
        tracking_id,
    )


def notify_authority_decision(citizen, tracking_id, approved: bool, reason=''):
    if approved:
        notify(
            citizen, 'AUTHORITY_APPROVED',
            'Application Approved by Police Authority',
            f"Congratulations! Your application {tracking_id} has been approved. "
            "A challan will be generated shortly.",
            tracking_id,
        )
    else:
        notify(
            citizen, 'AUTHORITY_REJECTED',
            'Application Rejected by Police Authority',
            f"Unfortunately, your application {tracking_id} has been rejected. "
            f"Reason: {reason or 'See portal for details.'}",
            tracking_id,
        )


def notify_challan_generated(citizen, tracking_id, challan_number, amount):
    notify(
        citizen, 'CHALLAN_GENERATED',
        'Payment Challan Generated',
        f"A challan (No: {challan_number}) of PKR {amount} has been generated for your application "
        f"{tracking_id}. Please complete the payment to receive your certificate.",
        tracking_id,
    )


def notify_payment_confirmed(citizen, tracking_id):
    notify(
        citizen, 'PAYMENT_CONFIRMED',
        'Payment Confirmed',
        f"Payment for application {tracking_id} has been confirmed. "
        "Your verification certificate will be issued shortly.",
        tracking_id,
    )


def notify_certificate_ready(citizen, tracking_id, certificate_number):
    notify(
        citizen, 'CERTIFICATE_READY',
        'Certificate Ready for Download',
        f"Your Police Verification Certificate (No: {certificate_number}) for application "
        f"{tracking_id} is ready. Please log in to download it.",
        tracking_id,
    )
