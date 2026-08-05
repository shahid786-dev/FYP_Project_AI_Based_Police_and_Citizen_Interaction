"""
NADRA Verification Service
===========================
Simulates NADRA identity cross-reference.

Since we cannot run actual biometric matching (requires dlib / CUDA), we use
a simulated confidence score:
  - If the citizen's CNIC exists in the NADRA DB → high confidence match
  - If not found                                 → NOT_FOUND
  - Names are compared loosely for an extra signal
"""

import difflib
from .models import NADRARecord, NADRAVerification


def _name_similarity(name_a: str, name_b: str) -> float:
    """Return 0-100 name similarity via SequenceMatcher."""
    ratio = difflib.SequenceMatcher(
        None,
        name_a.strip().lower(),
        name_b.strip().lower(),
    ).ratio()
    return round(ratio * 100, 2)


def perform_nadra_check(application) -> NADRAVerification:
    """
    Cross-reference the applicant's CNIC against the NADRA dummy database.
    Creates (or updates) a NADRAVerification record for the application.

    Returns the NADRAVerification instance.
    """
    citizen = application.applicant

    # If a previous check exists, update it (re-run scenario)
    try:
        verification = NADRAVerification.objects.get(application=application)
    except NADRAVerification.DoesNotExist:
        verification = NADRAVerification(application=application)

    try:
        nadra_record = NADRARecord.objects.get(cnic=citizen.cnic, is_active=True)
    except NADRARecord.DoesNotExist:
        # CNIC not found in NADRA DB – treat as Not Found
        verification.nadra_record     = None
        verification.result           = 'NOT_FOUND'
        verification.similarity_score = 0.0
        verification.notes            = (
            f"CNIC {citizen.cnic} not found in NADRA database."
        )
        verification.save()
        return verification

    # CNIC found – compute a simulated biometric score
    name_sim = _name_similarity(citizen.full_name, nadra_record.full_name)

    # Simulated confidence: base 80% if CNIC matches + up to 20% from name
    simulated_score = min(100.0, 80.0 + (name_sim * 0.2))

    threshold = 70.0
    if simulated_score >= threshold:
        result = 'MATCHED'
        notes  = (
            f"Identity matched. NADRA Name: {nadra_record.full_name}. "
            f"Name similarity: {name_sim}%. Simulated confidence: {simulated_score}%."
        )
    else:
        result = 'NOT_MATCHED'
        notes  = (
            f"Identity NOT matched. NADRA Name: {nadra_record.full_name}. "
            f"Name similarity: {name_sim}%. Simulated confidence: {simulated_score}%."
        )

    verification.nadra_record     = nadra_record
    verification.result           = result
    verification.similarity_score = simulated_score
    verification.notes            = notes
    verification.save()
    return verification
