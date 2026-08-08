"""
face_verification/embedding_store.py
=====================================
Thread-safe, in-memory embedding store.

Architecture
------------
- Embeddings are generated ONCE via the management command
  `generate_nadra_embeddings` and persisted as a pickle file.
- On Django startup (apps.py ready()), they are loaded into a singleton
  EmbeddingStore object that lives in process memory.
- Subsequent verifications only read from memory — zero disk I/O per request.

Embedding file format (pickle)
--------------------------------
{
    "<cnic>": {
        "embedding": np.ndarray (shape: (512,), dtype float32),
        "full_name": str,
        "father_name": str,
        "image_path": str,   # relative path from Id_Card_Dataset/
    },
    ...
}
"""

import os
import pickle
import logging
import threading
from typing import Dict, List, Optional, Tuple

import numpy as np

from django.conf import settings

from .exceptions import EmbeddingStoreError

logger = logging.getLogger('face_verification')


class EmbeddingStore:
    """
    Singleton in-memory store for all NADRA face embeddings.

    Usage
    -----
        store = EmbeddingStore.get_instance()
        results = store.find_best_match(query_embedding, top_k=1)
    """

    # ------------------------------------------------------------------ #
    # Class-level state (singleton)
    # ------------------------------------------------------------------ #
    _instance: Optional['EmbeddingStore'] = None
    _lock = threading.Lock()

    # ------------------------------------------------------------------ #
    # Constructor
    # ------------------------------------------------------------------ #
    def __init__(self):
        """
        Load embeddings from disk into RAM.
        Called exactly once via get_instance().
        """
        self._embeddings: Dict[str, dict] = {}

        # Matrix of shape (N, D) for vectorised cosine similarity
        self._matrix: Optional[np.ndarray] = None

        # Ordered list of CNICs matching rows in self._matrix
        self._cnic_index: List[str] = []

        self._load()

    # ------------------------------------------------------------------ #
    # Singleton accessor
    # ------------------------------------------------------------------ #
    @classmethod
    def get_instance(cls) -> 'EmbeddingStore':
        """Return the singleton, creating it on first call."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @classmethod
    def reset(cls):
        """
        Force reload on next get_instance() call.
        Call after re-generating embeddings (e.g., after the management command).
        """
        with cls._lock:
            cls._instance = None
        logger.info('EmbeddingStore singleton reset — will reload on next access.')

    # ------------------------------------------------------------------ #
    # Disk I/O
    # ------------------------------------------------------------------ #
    @staticmethod
    def _get_embedding_path() -> str:
        """Return the absolute path to the embeddings pickle file."""
        return os.path.join(
            settings.BASE_DIR,
            'face_verification',
            'embeddings',
            'nadra_embeddings.pkl',
        )

    def _load(self):
        """Load the embeddings pickle into memory and build the search matrix."""
        path = self._get_embedding_path()

        if not os.path.exists(path):
            logger.warning(
                'Embeddings file not found at %s. '
                'Run: python manage.py generate_nadra_embeddings', path
            )
            return

        try:
            with open(path, 'rb') as f:
                self._embeddings = pickle.load(f)

            logger.info('Loaded %d NADRA embeddings from disk.', len(self._embeddings))
            self._build_matrix()

        except (pickle.UnpicklingError, EOFError, Exception) as exc:
            raise EmbeddingStoreError(
                f'Failed to load embeddings from {path}: {exc}'
            ) from exc

    def _build_matrix(self):
        """
        Build a NumPy matrix from loaded embeddings for vectorised cosine search.
        Rows are L2-normalised so dot product == cosine similarity.
        """
        self._cnic_index = list(self._embeddings.keys())
        vectors = [self._embeddings[cnic]['embedding'] for cnic in self._cnic_index]

        if not vectors:
            return

        mat = np.array(vectors, dtype=np.float32)

        # L2-normalise each row
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1e-9, norms)  # avoid division by zero
        self._matrix = mat / norms

        logger.info(
            'Search matrix built: shape=%s  dtype=%s',
            self._matrix.shape, self._matrix.dtype
        )

    # ------------------------------------------------------------------ #
    # Public search API
    # ------------------------------------------------------------------ #
    @property
    def is_ready(self) -> bool:
        """True if embeddings are loaded and ready to search."""
        return self._matrix is not None and len(self._cnic_index) > 0

    @property
    def total_records(self) -> int:
        """Number of records currently in memory."""
        return len(self._embeddings)

    def get_record(self, cnic: str) -> Optional[dict]:
        """Retrieve a single embedding record by CNIC."""
        return self._embeddings.get(cnic)

    def find_best_match(
        self,
        query_embedding: np.ndarray,
        top_k: int = 1,
        threshold: float = 0.70,
    ) -> List[dict]:
        """
        Find the top-k closest embeddings using cosine similarity.

        Parameters
        ----------
        query_embedding : np.ndarray
            The 512-dim embedding of the live face (raw, will be normalised here).
        top_k : int
            Number of top matches to return.
        threshold : float
            Minimum cosine similarity (0–1) to be included in results.

        Returns
        -------
        List of dicts, sorted by similarity descending:
            [
                {
                    "cnic": str,
                    "full_name": str,
                    "father_name": str,
                    "similarity": float,      # 0–1 cosine similarity
                    "similarity_pct": float,  # 0–100 %
                },
                ...
            ]
        """
        if not self.is_ready:
            raise EmbeddingStoreError(
                'Embedding store is not ready. '
                'Run: python manage.py generate_nadra_embeddings'
            )

        # Normalise query vector
        q = np.array(query_embedding, dtype=np.float32)
        norm = np.linalg.norm(q)
        if norm < 1e-9:
            raise EmbeddingStoreError('Query embedding is a zero vector — invalid face encoding.')
        q = q / norm  # shape (D,)

        # Vectorised cosine similarity: dot product with L2-normed matrix
        # scores shape: (N,)
        scores = self._matrix @ q

        # Get top-k indices (largest first)
        if top_k >= len(scores):
            top_indices = np.argsort(scores)[::-1]
        else:
            # partial sort — much faster for large N
            top_indices = np.argpartition(scores, -top_k)[-top_k:]
            top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

        results = []
        for idx in top_indices:
            sim = float(scores[idx])
            if sim < threshold:
                continue
            cnic = self._cnic_index[idx]
            record = self._embeddings[cnic]
            results.append({
                'cnic': cnic,
                'full_name': record.get('full_name', 'Unknown'),
                'father_name': record.get('father_name', 'Unknown'),
                'similarity': round(sim, 6),
                'similarity_pct': round(sim * 100, 2),
                'image_path': record.get('image_path', ''),
            })

        return results
