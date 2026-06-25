"""
Advanced enhancement utilities — no scipy dependency.
Extra stages beyond the base pipeline:
  - Bilateral filter (edge-preserving)
  - Non-Local Means (NLM)
  - BayesShrink / VisuShrink adaptive thresholding
  - Multi-scale σ estimation
  - Full quality reporting (sharpness, contrast, entropy)
"""
import numpy as np
import cv2
import pywt
import time
import logging
from typing import Optional, Dict, Tuple

logger = logging.getLogger(__name__)


# ── Adaptive thresholds ─────────────────────────────────────────────────────

def bayesshrink_threshold(subband: np.ndarray, sigma_noise: float) -> float:
    s2n = sigma_noise ** 2
    s2y = float(np.var(subband))
    s2x = max(s2y - s2n, 1e-10)
    return float(s2n / np.sqrt(s2x))


def visushrink_threshold(size: int, sigma: float) -> float:
    return float(sigma * np.sqrt(2 * np.log(max(size, 2))))


def adaptive_wavelet_denoise(
    image: np.ndarray,
    sigma: float,
    level: int = 2,
    method: str = "bayesshrink",
) -> np.ndarray:
    f = image.astype(np.float64) / 255.0
    coeffs = pywt.wavedec2(f, "haar", level=level)
    new_coeffs = [coeffs[0]]
    for detail in coeffs[1:]:
        new_level = []
        for sub in detail:
            lam = (bayesshrink_threshold(sub, sigma) if method == "bayesshrink"
                   else visushrink_threshold(sub.size, sigma))
            new_level.append(pywt.threshold(sub, lam, mode="soft"))
        new_coeffs.append(tuple(new_level))
    rec = pywt.waverec2(new_coeffs, "haar")
    return np.clip(rec * 255.0, 0, 255).astype(np.uint8)


# ── Extra filters ───────────────────────────────────────────────────────────

def bilateral_denoise(image: np.ndarray, sigma: float) -> np.ndarray:
    sc = max(20.0, sigma * 255.0 * 0.8)
    return cv2.bilateralFilter(image, 9, sc, sc)


def nlm_denoise(image: np.ndarray, sigma: float) -> np.ndarray:
    h = max(3.0, sigma * 255.0 * 0.6)
    return cv2.fastNlMeansDenoising(image, None, h, 7, 21)


# ── Multi-scale noise estimation ────────────────────────────────────────────

def multiscale_noise_estimate(image: np.ndarray) -> Dict[str, float]:
    f = image.astype(np.float64) / 255.0
    out: Dict[str, float] = {}
    for lvl in range(1, 4):
        try:
            coeffs = pywt.wavedec2(f, "haar", level=lvl)
            hh = coeffs[1][2]
            out[f"level_{lvl}"] = round(float(np.median(np.abs(hh)) / 0.6745), 6)
        except Exception:
            break
    if out:
        out["mean"] = round(float(np.mean(list(out.values()))), 6)
    return out


# ── Quality scoring ─────────────────────────────────────────────────────────

def sharpness_score(image: np.ndarray) -> float:
    return float(cv2.Laplacian(image.astype(np.float64), cv2.CV_64F).var())


def contrast_score(image: np.ndarray) -> float:
    return float(image.astype(np.float64).std())


def entropy_score(image: np.ndarray) -> float:
    hist = cv2.calcHist([image], [0], None, [256], [0, 256]).flatten()
    p    = hist / (hist.sum() + 1e-10)
    p    = p[p > 0]
    return float(-np.sum(p * np.log2(p)))


def full_quality_report(original: np.ndarray, denoised: np.ndarray) -> Dict[str, float]:
    from app.services.denoising_pipeline import (
        compute_psnr, compute_ssim, compute_mse, compute_snr,
    )
    return {
        "psnr":               round(compute_psnr(original, denoised), 4),
        "ssim":               round(compute_ssim(original, denoised), 4),
        "mse":                round(compute_mse(original, denoised),  4),
        "snr":                round(compute_snr(original, denoised),  4),
        "sharpness_original": round(sharpness_score(original), 2),
        "sharpness_denoised": round(sharpness_score(denoised), 2),
        "sharpness_ratio":    round(
            sharpness_score(denoised) / max(sharpness_score(original), 1e-6), 4),
        "contrast_original":  round(contrast_score(original), 2),
        "contrast_denoised":  round(contrast_score(denoised), 2),
        "entropy_original":   round(entropy_score(original), 4),
        "entropy_denoised":   round(entropy_score(denoised), 4),
    }


# ── Enhanced pipeline ───────────────────────────────────────────────────────

def enhanced_pipeline(
    noisy: np.ndarray,
    original: Optional[np.ndarray] = None,
    sigma: float = 0.15,
    use_bilateral: bool = True,
    use_nlm: bool = False,
    wavelet_threshold_method: str = "bayesshrink",
    dwt_level: int = 2,
) -> Tuple[np.ndarray, Dict]:
    """AGF → [Bilateral] → [NLM] → Adaptive Wavelet Threshold."""
    t0 = time.perf_counter()
    from app.services.denoising_pipeline import anisotropic_gaussian_filter, compute_psnr, compute_ssim, compute_mse, compute_snr

    if noisy.ndim == 3:
        noisy = cv2.cvtColor(noisy, cv2.COLOR_BGR2GRAY)
    noisy = np.clip(noisy, 0, 255).astype(np.uint8)

    sigma_px = sigma * 255.0
    ksize = max(3, int(6 * sigma_px + 1))
    if ksize % 2 == 0: ksize += 1
    ksize = min(ksize, 21)

    result = anisotropic_gaussian_filter(noisy, sigma_px, ksize)
    if use_bilateral:
        result = bilateral_denoise(result, sigma)
    if use_nlm:
        result = nlm_denoise(result, sigma)
    result = adaptive_wavelet_denoise(result, sigma, level=dwt_level, method=wavelet_threshold_method)
    if result.shape != noisy.shape:
        result = cv2.resize(result, (noisy.shape[1], noisy.shape[0]))

    elapsed = round((time.perf_counter() - t0) * 1000, 2)
    ref = original if original is not None else noisy
    stages = "+".join(filter(None, [
        "AGF",
        "Bilateral" if use_bilateral else "",
        "NLM" if use_nlm else "",
        f"AdaptiveWavelet({wavelet_threshold_method})",
    ]))

    metrics = {
        "psnr": round(compute_psnr(ref, result), 4),
        "ssim": round(compute_ssim(ref, result), 4),
        "mse":  round(compute_mse(ref, result),  4),
        "snr":  round(compute_snr(ref, result),  4),
        "processing_time_ms": elapsed,
        "pipeline": stages,
    }
    return result, metrics
