"""
face_verification/exceptions.py
================================
Custom exception hierarchy for the face verification module.
Each exception maps to a specific, meaningful error code and HTTP status.
"""


class FaceVerificationError(Exception):
    """Base exception for all face verification errors."""
    error_code = 'FACE_VERIFICATION_ERROR'
    default_message = 'An error occurred during face verification.'

    def __init__(self, message: str = None, details: dict = None):
        self.message = message or self.default_message
        self.details = details or {}
        super().__init__(self.message)


class NoFaceDetectedError(FaceVerificationError):
    """Raised when no face can be found in an image."""
    error_code = 'NO_FACE_DETECTED'
    default_message = (
        'No face was detected in the provided image. '
        'Ensure the image is clear, well-lit, and the face is fully visible.'
    )


class MultipleFacesDetectedError(FaceVerificationError):
    """Raised when more than one face is found in an image."""
    error_code = 'MULTIPLE_FACES_DETECTED'
    default_message = (
        'Multiple faces were detected in the image. '
        'Please ensure only one person is visible in the webcam frame.'
    )


class ImageNotFoundError(FaceVerificationError):
    """Raised when a required image file cannot be located."""
    error_code = 'IMAGE_NOT_FOUND'
    default_message = 'The specified image file could not be found.'


class CorruptedImageError(FaceVerificationError):
    """Raised when an image file cannot be decoded / is corrupted."""
    error_code = 'CORRUPTED_IMAGE'
    default_message = (
        'The image file appears to be corrupted or in an unsupported format. '
        'Please capture a new photo.'
    )


class PoorImageQualityError(FaceVerificationError):
    """Raised when image quality metrics fall below the acceptable threshold."""
    error_code = 'POOR_IMAGE_QUALITY'
    default_message = (
        'The captured image quality is too low for reliable verification. '
        'Ensure adequate lighting and a steady camera.'
    )


class LowConfidenceMatchError(FaceVerificationError):
    """Raised when the best match similarity score is below the threshold."""
    error_code = 'LOW_CONFIDENCE_MATCH'
    default_message = (
        'Verification failed. The live face did not match any record in the '
        'NADRA database with sufficient confidence.'
    )


class EmbeddingStoreError(FaceVerificationError):
    """Raised when the embedding store cannot be loaded or queried."""
    error_code = 'EMBEDDING_STORE_ERROR'
    default_message = 'The face embedding database could not be loaded.'


class DatabaseError(FaceVerificationError):
    """Raised when a database operation fails during verification."""
    error_code = 'DATABASE_ERROR'
    default_message = 'A database error occurred while saving the verification result.'
