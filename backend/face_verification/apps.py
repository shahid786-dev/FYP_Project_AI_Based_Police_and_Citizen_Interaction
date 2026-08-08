"""
face_verification/apps.py
=========================
Django AppConfig for the face_verification module.
Pre-loads the embedding store into memory on startup for fast lookup.
"""

from django.apps import AppConfig


class FaceVerificationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'face_verification'
    verbose_name = 'AI Face Verification'

    def ready(self):
        """
        Called once when Django starts.
        Pre-warms the embedding cache so the first verification request
        doesn't incur the full load penalty.
        """
        # Import here to avoid circular imports at module level
        try:
            from .embedding_store import EmbeddingStore
            EmbeddingStore.get_instance()  # Warm up cache silently
        except Exception:
            # If embeddings file doesn't exist yet (first run), ignore
            pass
