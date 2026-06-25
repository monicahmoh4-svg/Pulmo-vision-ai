"""Image I/O — DICOM / PNG / JPG → grayscale uint8 numpy arrays."""
import numpy as np
import cv2
import io
import base64
import logging
from pathlib import Path
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


def load_image_from_bytes(data: bytes, filename: str = "") -> np.ndarray:
    ext = Path(filename).suffix.lower()
    if ext in (".dcm", ".dicom"):
        return _load_dicom(data)
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Cannot decode image: {filename}")
    return img


def _load_dicom(data: bytes) -> np.ndarray:
    try:
        import pydicom
        ds = pydicom.dcmread(io.BytesIO(data))
        px = ds.pixel_array.astype(np.float64)
        lo, hi = px.min(), px.max()
        if hi > lo:
            px = (px - lo) / (hi - lo) * 255.0
        return px.astype(np.uint8)
    except ImportError:
        logger.warning("pydicom not installed — treating as raw image bytes")
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("Cannot decode DICOM without pydicom")
        return img


def preprocess_image(
    image: np.ndarray,
    target_size: Tuple[int, int] = (512, 512),
) -> np.ndarray:
    if image.ndim == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if image.shape[:2] != target_size:
        image = cv2.resize(image, target_size, interpolation=cv2.INTER_LANCZOS4)
    return image.astype(np.uint8)


def image_to_base64(image: np.ndarray, fmt: str = ".png") -> str:
    ok, buf = cv2.imencode(fmt, image)
    if not ok:
        raise ValueError("Failed to encode image to base64")
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def save_image(image: np.ndarray, path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(path, image)


def load_image_from_path(path: str) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Image not found: {path}")
    return img


def get_image_stats(image: np.ndarray) -> dict:
    return {
        "width":  int(image.shape[1]),
        "height": int(image.shape[0]),
        "mean":   round(float(np.mean(image)), 2),
        "std":    round(float(np.std(image)),  2),
        "min":    int(image.min()),
        "max":    int(image.max()),
    }
