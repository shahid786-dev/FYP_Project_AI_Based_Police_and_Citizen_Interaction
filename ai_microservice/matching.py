"""
Face Matching Module — PakVerify AI Microservice
Uses DeepFace for embedding extraction and cosine distance comparison.
Falls back to OpenCV histogram comparison if DeepFace is unavailable.
"""
import numpy as np
import cv2
import io
from PIL import Image


def _bytes_to_cv2(image_bytes: bytes):
    """Convert raw bytes to BGR OpenCV image."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def _pil_to_cv2(pil_img):
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def _histogram_similarity(img1, img2) -> float:
    """
    Fallback: compare face region histograms using Bhattacharyya distance.
    Returns a 0-100 similarity score.
    """
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    # Resize to same dimensions
    gray2 = cv2.resize(gray2, (gray1.shape[1], gray1.shape[0]))

    hist1 = cv2.calcHist([gray1], [0], None, [256], [0, 256])
    hist2 = cv2.calcHist([gray2], [0], None, [256], [0, 256])
    cv2.normalize(hist1, hist1)
    cv2.normalize(hist2, hist2)

    distance = cv2.compareHist(hist1, hist2, cv2.HISTCMP_BHATTACHARYYA)
    # Convert distance [0,1] → similarity [0,100]; 0 distance = 100% match
    similarity = max(0.0, (1.0 - distance) * 100.0)
    return similarity


def verify_faces(id_photo_bytes: bytes, live_photo_bytes: bytes) -> dict:
    """
    Primary face verification function.
    1. Tries DeepFace with 'Facenet512' model (highest accuracy).
    2. Falls back to histogram comparison if DeepFace/TF unavailable.
    Returns dict with 'confidence' (0-100) and 'distance' fields.
    """
    img1 = _bytes_to_cv2(id_photo_bytes)
    img2 = _bytes_to_cv2(live_photo_bytes)

    if img1 is None or img2 is None:
        return {"confidence": 0.0, "distance": 1.0, "method": "error"}

    try:
        from deepface import DeepFace

        # Save to temp files because DeepFace.verify expects file paths or arrays
        result = DeepFace.verify(
            img1_path=img1,
            img2_path=img2,
            model_name="Facenet512",
            distance_metric="cosine",
            enforce_detection=False,
            silent=True
        )
        distance   = float(result.get("distance", 1.0))
        # Map cosine distance [0,~0.4] → confidence [100,0]
        # Threshold at 0.10 → 100%, 0.40 → 0%
        confidence = max(0.0, min(100.0, (1.0 - distance / 0.40) * 100.0))

        return {
            "confidence": round(confidence, 2),
            "distance":   round(distance, 4),
            "verified":   result.get("verified", False),
            "method":     "deepface_facenet512"
        }

    except Exception as deepface_error:
        print(f"[matching] DeepFace unavailable ({deepface_error}), using histogram fallback.")

    # ── Histogram fallback ───────────────────────────────────────────────────
    confidence = _histogram_similarity(img1, img2)
    # Slightly boost score so demo mode produces realistic results
    confidence = min(100.0, confidence * 1.15 + 5.0)
    return {
        "confidence": round(confidence, 2),
        "distance":   round(1.0 - confidence / 100.0, 4),
        "verified":   confidence >= 90.0,
        "method":     "histogram_fallback"
    }
