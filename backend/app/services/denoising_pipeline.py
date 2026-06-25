"""
LungDenoise AI — Comprehensive Denoising Pipeline
===================================================
Stage 1 : Anisotropic Gaussian Filter (AGF)          — noise-adaptive edge-preserving
Stage 2 : Haar Wavelet DWT (level-2) + BayesShrink   — sub-band soft thresholding
Stage 3 : DnCNN (17-layer residual CNN)              — learned noise mapping
Stage 4 : Inverse Haar DWT (IDWT)                    — reconstruction
Stage 5 : Total-Variation post-smoothing             — removes residual artifacts

Reference: Abuya et al., Appl. Sci. 2023, 13, 12069
           doi: 10.3390/app132112069
"""

import numpy as np
import cv2
import pywt
import logging
import time
from typing import Optional, Dict, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class DenoiseResult:
    denoised: np.ndarray
    psnr: float
    ssim: float
    mse: float
    snr: float
    noise_sigma: float
    processing_time_ms: float
    pipeline: str = "AGF+Haar+BayesShrink+DnCNN+TV"
    stage_times: Dict[str, float] = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════
# NOISE ESTIMATION
# ═══════════════════════════════════════════════════════════════════════════════

def estimate_noise_mad(image: np.ndarray) -> float:
    """MAD estimator: σ ≈ MAD / 0.6745  (robust, distribution-free)."""
    f = image.astype(np.float64) / 255.0
    return float(np.clip(np.median(np.abs(f - np.median(f))) / 0.6745, 1e-4, 1.0))


def estimate_noise_wavelet(image: np.ndarray) -> float:
    """Donoho-Johnstone: use HH1 diagonal of Haar DWT."""
    f = image.astype(np.float64) / 255.0
    try:
        _, (_, _, hh) = pywt.dwt2(f, "haar")
        return float(np.clip(np.median(np.abs(hh)) / 0.6745, 1e-4, 1.0))
    except Exception:
        return estimate_noise_mad(image)


def estimate_noise_laplacian(image: np.ndarray) -> float:
    """Laplacian variance — quick estimate for Gaussian noise."""
    lap = cv2.Laplacian(image.astype(np.float64), cv2.CV_64F)
    return float(np.clip(np.sqrt(np.abs(np.mean(lap**2)) / 36.0) / 255.0, 1e-4, 1.0))


def estimate_noise(image: np.ndarray, method: str = "wavelet") -> float:
    dispatch = {
        "wavelet":   estimate_noise_wavelet,
        "mad":       estimate_noise_mad,
        "laplacian": estimate_noise_laplacian,
    }
    return dispatch.get(method, estimate_noise_wavelet)(image)


def multiscale_noise_estimate(image: np.ndarray) -> Dict[str, float]:
    """Estimate σ at levels 1–3; return per-level + mean."""
    f = image.astype(np.float64) / 255.0
    out = {}
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


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 1 — ANISOTROPIC GAUSSIAN FILTER
# ═══════════════════════════════════════════════════════════════════════════════

def anisotropic_gaussian_filter(image: np.ndarray, sigma: float, ksize: Optional[int] = None) -> np.ndarray:
    """
    Edge-preserving anisotropic Gaussian filter.
    Uses gradient magnitude to blend smoothed and original at edges:
      blend = (1 - edge_weight) * smoothed + edge_weight * original
    """
    if ksize is None:
        ksize = max(3, int(6 * sigma + 1))
        if ksize % 2 == 0:
            ksize += 1
        ksize = min(ksize, 21)

    img_f = image.astype(np.float64)

    # Smooth along X and Y independently (anisotropy)
    h_pass = cv2.GaussianBlur(img_f, (ksize, 1), sigmaX=sigma, sigmaY=0)
    v_pass = cv2.GaussianBlur(img_f, (1, ksize), sigmaX=0, sigmaY=sigma * 0.7)
    blended = (h_pass + v_pass) / 2.0

    # Compute gradient map for edge detection
    gx = cv2.Sobel(img_f, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(img_f, cv2.CV_64F, 0, 1, ksize=3)
    grad = np.sqrt(gx**2 + gy**2)
    edge_w = np.clip(grad / (grad.max() + 1e-8), 0, 1)

    # Preserve edges: at high-gradient pixels, lean toward original
    result = (1.0 - edge_w) * blended + edge_w * img_f
    return np.clip(result, 0, 255).astype(np.uint8)


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 2 — HAAR WAVELET + ADAPTIVE THRESHOLDING
# ═══════════════════════════════════════════════════════════════════════════════

def bayesshrink_threshold(subband: np.ndarray, sigma_noise: float) -> float:
    """
    BayesShrink adaptive threshold per sub-band.
    λ = σ²_noise / max(σ_signal, ε)
    Better detail preservation than VisuShrink.
    """
    s2n = sigma_noise ** 2
    s2y = float(np.var(subband))
    s2x = max(s2y - s2n, 1e-10)
    return float(s2n / np.sqrt(s2x))


def visushrink_threshold(size: int, sigma: float) -> float:
    """VisuShrink universal threshold: λ = σ√(2·ln N)."""
    return float(sigma * np.sqrt(2 * np.log(max(size, 2))))


def haar_dwt_denoise(image: np.ndarray, sigma: float, level: int = 2,
                     threshold_method: str = "bayesshrink") -> np.ndarray:
    """
    Haar 2-D DWT decomposition → adaptive soft-threshold → IDWT.
    Sub-bands: LL (approx) + LH, HL, HH at each level.
    """
    f = image.astype(np.float64) / 255.0
    coeffs = pywt.wavedec2(f, "haar", level=level)

    new_coeffs = [coeffs[0]]  # Keep approximation sub-band unchanged
    for level_detail in coeffs[1:]:
        new_level = []
        for subband in level_detail:
            if threshold_method == "bayesshrink":
                lam = bayesshrink_threshold(subband, sigma)
            else:
                lam = visushrink_threshold(subband.size, sigma)
            new_level.append(pywt.threshold(subband, lam, mode="soft"))
        new_coeffs.append(tuple(new_level))

    rec = pywt.waverec2(new_coeffs, "haar")
    return np.clip(rec * 255.0, 0, 255).astype(np.uint8)


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 3 — DnCNN
# ═══════════════════════════════════════════════════════════════════════════════

def build_dncnn(depth: int = 17, filters: int = 64) -> Optional[object]:
    """
    Build DnCNN architecture.
    Layer 1:      Conv(64, 3×3) + ReLU
    Layers 2–16:  Conv(64, 3×3) + BatchNorm + ReLU
    Layer 17:     Conv(1, 3×3)
    Skip:         output = input − predicted_noise
    """
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, Model

        inp = layers.Input(shape=(None, None, 1), name="noisy_input")
        x = layers.Conv2D(filters, 3, padding="same", use_bias=False, name="conv1")(inp)
        x = layers.Activation("relu")(x)

        for i in range(depth - 2):
            x = layers.Conv2D(filters, 3, padding="same", use_bias=False, name=f"conv{i+2}")(x)
            x = layers.BatchNormalization(momentum=0.9, epsilon=1e-4)(x)
            x = layers.Activation("relu")(x)

        x = layers.Conv2D(1, 3, padding="same", use_bias=False, name="conv_out")(x)
        out = layers.Subtract(name="residual")([inp, x])

        model = Model(inp, out, name="DnCNN_17")
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.00238),
            loss="mse",
            metrics=["mae"],
        )
        return model
    except ImportError:
        logger.warning("TensorFlow not available — DnCNN stage skipped.")
        return None


_dncnn_cache: Optional[object] = None


def get_dncnn(weights_path: Optional[str] = None) -> Optional[object]:
    global _dncnn_cache
    if _dncnn_cache is None:
        model = build_dncnn()
        if model is not None and weights_path:
            try:
                model.load_weights(weights_path)
                logger.info("DnCNN weights loaded: %s", weights_path)
            except Exception as e:
                logger.warning("DnCNN weights not loaded (%s) — using untrained model.", e)
        _dncnn_cache = model
    return _dncnn_cache


def dncnn_denoise(image: np.ndarray, model) -> np.ndarray:
    """Run DnCNN inference. Falls back to identity if model is None."""
    if model is None:
        return image
    try:
        f = image.astype(np.float32) / 255.0
        inp = f[np.newaxis, :, :, np.newaxis]
        out = model.predict(inp, verbose=0)[0, :, :, 0]
        return np.clip(out * 255.0, 0, 255).astype(np.uint8)
    except Exception as e:
        logger.error("DnCNN inference error: %s", e)
        return image


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 4 — TOTAL VARIATION SMOOTHING (post-processing)
# ═══════════════════════════════════════════════════════════════════════════════

def total_variation_smooth(image: np.ndarray, weight: float = 0.05, iters: int = 5) -> np.ndarray:
    """
    Chambolle total-variation denoising (iterative gradient descent).
    Removes residual checkerboard and JPEG-like artifacts.
    weight: regularisation strength (0.01 subtle → 0.1 strong)
    """
    u = image.astype(np.float64) / 255.0
    for _ in range(iters):
        # Gradient
        gx = np.roll(u, -1, axis=1) - u
        gy = np.roll(u, -1, axis=0) - u
        mag = np.sqrt(gx**2 + gy**2 + 1e-8)
        # Divergence
        px = gx / mag
        py = gy / mag
        div = (px - np.roll(px, 1, axis=1)) + (py - np.roll(py, 1, axis=0))
        u = u + weight * div
        u = np.clip(u, 0, 1)
    return (u * 255.0).astype(np.uint8)


# ═══════════════════════════════════════════════════════════════════════════════
# QUALITY METRICS
# ═══════════════════════════════════════════════════════════════════════════════

def compute_psnr(original: np.ndarray, denoised: np.ndarray) -> float:
    mse = compute_mse(original, denoised)
    if mse < 1e-10:
        return 100.0
    return float(10 * np.log10(255.0**2 / mse))


def compute_mse(original: np.ndarray, denoised: np.ndarray) -> float:
    o = original.astype(np.float64)
    d = denoised.astype(np.float64)
    return float(np.mean((o - d) ** 2))


def compute_ssim(original: np.ndarray, denoised: np.ndarray) -> float:
    """Full SSIM implementation — no scipy/skimage dependency."""
    o = original.astype(np.float64)
    d = denoised.astype(np.float64)
    C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2

    # Local window statistics (11×11 Gaussian kernel)
    k = cv2.getGaussianKernel(11, 1.5)
    kernel = k @ k.T

    def filt(x):
        return cv2.filter2D(x, -1, kernel)

    mu_o = filt(o);  mu_d = filt(d)
    mu_o2 = mu_o**2; mu_d2 = mu_d**2; mu_od = mu_o * mu_d
    sig_o  = filt(o*o)  - mu_o2
    sig_d  = filt(d*d)  - mu_d2
    sig_od = filt(o*d)  - mu_od

    num = (2*mu_od + C1) * (2*sig_od + C2)
    den = (mu_o2 + mu_d2 + C1) * (sig_o + sig_d + C2)
    ssim_map = num / (den + 1e-10)
    return float(np.clip(ssim_map.mean(), 0.0, 1.0))


def compute_snr(original: np.ndarray, denoised: np.ndarray) -> float:
    o = original.astype(np.float64)
    d = denoised.astype(np.float64)
    sp = np.mean(o**2)
    np_ = np.mean((o - d)**2)
    if np_ < 1e-10:
        return 60.0
    return float(10 * np.log10(sp / np_))


def sharpness_score(image: np.ndarray) -> float:
    """Laplacian variance — higher = sharper."""
    return float(cv2.Laplacian(image.astype(np.float64), cv2.CV_64F).var())


# ═══════════════════════════════════════════════════════════════════════════════
# SYNTHETIC NOISE
# ═══════════════════════════════════════════════════════════════════════════════

def add_gaussian_noise(image: np.ndarray, sigma: float = 0.15) -> np.ndarray:
    """m(x,y) = i(x,y) + n(x,y), n ~ N(0, σ²)."""
    f = image.astype(np.float64) / 255.0
    n = np.random.normal(0, sigma, f.shape)
    return np.clip((f + n) * 255.0, 0, 255).astype(np.uint8)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

def run_denoising_pipeline(
    image: np.ndarray,
    original_clean: Optional[np.ndarray] = None,
    sigma: Optional[float] = None,
    threshold: float = 0.05,
    dwt_level: int = 2,
    estimation_method: str = "wavelet",
    threshold_method: str = "bayesshrink",
    use_dncnn: bool = True,
    use_tv: bool = True,
    tv_weight: float = 0.03,
    weights_path: Optional[str] = None,
) -> DenoiseResult:
    """
    Full 5-stage hospital-grade denoising pipeline.

    Returns DenoiseResult with image, metrics, and per-stage timing.
    """
    t_total = time.perf_counter()
    stage_times: Dict[str, float] = {}

    # ── Ensure grayscale uint8 ───────────────────────────────────────────────
    if image.ndim == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    image = np.clip(image, 0, 255).astype(np.uint8)

    # ── Stage 0: Estimate noise σ ────────────────────────────────────────────
    t0 = time.perf_counter()
    if sigma is None:
        sigma = estimate_noise(image, estimation_method)
    stage_times["noise_estimation_ms"] = round((time.perf_counter() - t0) * 1000, 2)
    logger.info("Noise σ = %.4f (method: %s)", sigma, estimation_method)

    # ── Stage 1: Anisotropic Gaussian Filter ─────────────────────────────────
    t0 = time.perf_counter()
    sigma_px = sigma * 255.0
    ksize = max(3, int(6 * sigma_px + 1))
    if ksize % 2 == 0:
        ksize += 1
    ksize = min(ksize, 21)
    after_agf = anisotropic_gaussian_filter(image, sigma_px, ksize)
    stage_times["agf_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # ── Stage 2: Haar DWT + Adaptive Threshold ────────────────────────────────
    t0 = time.perf_counter()
    after_wavelet = haar_dwt_denoise(
        after_agf, sigma=sigma, level=dwt_level,
        threshold_method=threshold_method,
    )
    # Resize if DWT padding changed shape
    if after_wavelet.shape != image.shape:
        after_wavelet = cv2.resize(after_wavelet, (image.shape[1], image.shape[0]),
                                   interpolation=cv2.INTER_LINEAR)
    stage_times["wavelet_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # ── Stage 3: DnCNN ────────────────────────────────────────────────────────
    t0 = time.perf_counter()
    if use_dncnn:
        model = get_dncnn(weights_path)
        after_dncnn = dncnn_denoise(after_wavelet, model)
    else:
        after_dncnn = after_wavelet
    stage_times["dncnn_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # ── Stage 4: Total Variation post-smoothing ───────────────────────────────
    t0 = time.perf_counter()
    final = total_variation_smooth(after_dncnn, weight=tv_weight) if use_tv else after_dncnn
    stage_times["tv_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # ── Metrics ───────────────────────────────────────────────────────────────
    ref = original_clean if original_clean is not None else image
    psnr = compute_psnr(ref, final)
    ssim = compute_ssim(ref, final)
    mse  = compute_mse(ref, final)
    snr  = compute_snr(ref, final)

    total_ms = round((time.perf_counter() - t_total) * 1000, 2)
    stage_times["total_ms"] = total_ms

    logger.info(
        "Pipeline done — PSNR=%.2f SSIM=%.4f MSE=%.2f SNR=%.2f total=%.1fms",
        psnr, ssim, mse, snr, total_ms,
    )

    return DenoiseResult(
        denoised=final,
        psnr=psnr, ssim=ssim, mse=mse, snr=snr,
        noise_sigma=round(sigma, 4),
        processing_time_ms=total_ms,
        pipeline="AGF+Haar+BayesShrink+DnCNN+TV",
        stage_times=stage_times,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# BENCHMARKING
# ═══════════════════════════════════════════════════════════════════════════════

def benchmark_all_methods(original: np.ndarray, noisy: np.ndarray) -> Dict[str, Dict]:
    """Compare proposed pipeline vs 7 standard methods."""
    def _m(d):
        return {
            "psnr": round(compute_psnr(original, d), 4),
            "ssim": round(compute_ssim(original, d), 4),
            "mse":  round(compute_mse(original, d),  4),
            "snr":  round(compute_snr(original, d),  4),
        }

    results = {}
    results["mean"]     = _m(cv2.blur(noisy, (5, 5)))
    results["median"]   = _m(cv2.medianBlur(noisy, 5))
    results["gaussian"] = _m(cv2.GaussianBlur(noisy, (5, 5), 1.5))
    results["bilateral"]= _m(cv2.bilateralFilter(noisy, 9, 75, 75))
    results["nlm"]      = _m(cv2.fastNlMeansDenoising(noisy, h=10))

    try:
        sigma = estimate_noise_wavelet(noisy)
        dw = haar_dwt_denoise(noisy, sigma=sigma, level=2, threshold_method="bayesshrink")
        if dw.shape != original.shape:
            dw = cv2.resize(dw, (original.shape[1], original.shape[0]))
        results["dwt"] = _m(dw)
    except Exception:
        results["dwt"] = _m(noisy)

    pr = run_denoising_pipeline(noisy, original_clean=original, use_dncnn=False, use_tv=True)
    results["proposed"] = {
        "psnr": round(pr.psnr, 4), "ssim": round(pr.ssim, 4),
        "mse":  round(pr.mse, 4),  "snr":  round(pr.snr, 4),
    }
    return results
