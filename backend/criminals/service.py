"""
Criminal Record Auto-Check Service
====================================
Called automatically after AI face verification succeeds.
Checks the CNIC against the CriminalRecord database and stores a result.
"""

from .models import CriminalRecord, CriminalCheckResult


def perform_criminal_check(application) -> CriminalCheckResult:
    """
    Automatically check the applicant's CNIC against the criminal database.
    Creates/updates a CriminalCheckResult for the given application.
    """
    citizen = application.applicant

    # Re-use existing result if present (re-run scenario)
    try:
        check = CriminalCheckResult.objects.get(application=application)
    except CriminalCheckResult.DoesNotExist:
        check = CriminalCheckResult(application=application)

    try:
        record = CriminalRecord.objects.get(cnic=citizen.cnic)
    except CriminalRecord.DoesNotExist:
        check.result          = 'CLEAN'
        check.matched_record  = None
        check.report_summary  = (
            f"No criminal record found for CNIC {citizen.cnic} ({citizen.full_name}). "
            "Background check PASSED."
        )
        check.save()
        return check

    # A record was found – determine severity
    check.matched_record = record

    if record.is_wanted:
        check.result        = 'WANTED'
        check.report_summary = (
            f"⚠ WANTED PERSON: {record.name} (CNIC: {record.cnic}). "
            f"Crime: {record.crime_type or 'N/A'}. Station: {record.police_station or 'N/A'}. "
            f"FIR: {record.fir_number or 'N/A'}."
        )
    elif record.crime_severity == 'SERIOUS' or record.is_blacklisted:
        check.result        = 'SERIOUS_RECORD'
        check.report_summary = (
            f"SERIOUS CRIMINAL RECORD: {record.name} (CNIC: {record.cnic}). "
            f"Crime: {record.crime_type or 'N/A'}. Station: {record.police_station or 'N/A'}. "
            f"FIR: {record.fir_number or 'N/A'}. Blacklisted: {record.is_blacklisted}."
        )
    elif record.crime_severity == 'MINOR':
        check.result        = 'MINOR_RECORD'
        check.report_summary = (
            f"MINOR RECORD: {record.name} (CNIC: {record.cnic}). "
            f"Crime: {record.crime_type or 'N/A'}. Station: {record.police_station or 'N/A'}."
        )
    else:
        # status == SUSPECTED or other
        check.result        = 'MINOR_RECORD'
        check.report_summary = (
            f"SUSPECTED / UNDER INVESTIGATION: {record.name} (CNIC: {record.cnic})."
        )

    check.save()
    return check
