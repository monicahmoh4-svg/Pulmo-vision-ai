"""Denoising endpoint — AGF + Haar BayesShrink + DnCNN + TV pipeline."""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional
import os, cv2, numpy as np, logging

from app.core.database import get_db
from app.core.config import settings
from app.models.image_record import ImageRecord, ProcessingStatus
from app.services.denoising_pipeline import (
    run_denoising_pipeline, add_gaussian_noise,
    benchmark_all_methods, estimate_noise,
)
from app.services.image_service import (
    load_image_from_path, save_image,
    image_to_base64, preprocess_image,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class DenoiseRequest(BaseModel):
    image_id: str
    noise_sigma: Optional[float] = Field(None, ge=0.001, le=1.0)
    noise_intensity_pct: Optional[float] = Field(None, ge=0, le=100)
    threshold: float = Field(0.05, ge=0.001, le=0.5)
    dwt_level: int = Field(2, ge=1, le=4)
    estimation_method: str = Field("wavelet", pattern="^(wavelet|mad|laplacian)$")
    threshold_method: str = Field("bayesshrink", pattern="^(bayesshrink|visushrink)$")
    use_dncnn: bool = True
    use_tv: bool = True
    tv_weight: float = Field(0.03, ge=0.001, le=0.2)
    add_noise_first: bool = False
    run_benchmark: bool = False


@router.post("/denoise")
async def denoise_image(req: DenoiseRequest, db: AsyncSession = Depends(get_db)):
    result_q = await db.execute(select(ImageRecord).where(ImageRecord.id == req.image_id))
    record = result_q.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found — upload it first via /api/v1/ingest")

    record.status = ProcessingStatus.processing
    await db.commit()

    try:
        original = load_image_from_path(record.original_path)
        noisy = original

        if req.add_noise_first and req.noise_intensity_pct:
            noisy = add_gaussian_noise(original, sigma=req.noise_intensity_pct / 100)
            noisy_path = record.original_path.replace("_original", "_noisy")
            save_image(noisy, noisy_path)
            record.noisy_path = noisy_path
            record.noise_intensity_pct = req.noise_intensity_pct

        result = run_denoising_pipeline(
            noisy,
            original_clean=original,
            sigma=req.noise_sigma,
            threshold=req.threshold,
            dwt_level=req.dwt_level,
            estimation_method=req.estimation_method,
            threshold_method=req.threshold_method,
            use_dncnn=req.use_dncnn,
            use_tv=req.use_tv,
            tv_weight=req.tv_weight,
            weights_path=settings.MODEL_PATH if settings.USE_PRETRAINED_DNCNN else None,
        )

        denoised_path = record.original_path.replace("_original", "_denoised")
        save_image(result.denoised, denoised_path)

        record.denoised_path = denoised_path
        record.psnr = round(result.psnr, 4)
        record.ssim = round(result.ssim, 4)
        record.mse  = round(result.mse,  4)
        record.snr  = round(result.snr,  4)
        record.noise_sigma = round(result.noise_sigma, 4)
        record.processing_time_ms = round(result.processing_time_ms, 2)
        record.pipeline_used = result.pipeline
        record.status = ProcessingStatus.complete
        await db.commit()

        response = {
            "id": record.id,
            "status": "complete",
            "metrics": {
                "psnr": record.psnr,
                "ssim": record.ssim,
                "mse":  record.mse,
                "snr":  record.snr,
            },
            "stage_times": result.stage_times,
            "noise_sigma": record.noise_sigma,
            "processing_time_ms": record.processing_time_ms,
            "pipeline": result.pipeline,
            "denoised_image": image_to_base64(result.denoised),
        }

        if req.run_benchmark:
            response["benchmark"] = benchmark_all_methods(original, noisy)

        return response

    except Exception as e:
        record.status = ProcessingStatus.failed
        await db.commit()
        logger.error("Denoising failed for %s: %s", req.image_id, e)
        raise HTTPException(500, f"Denoising failed: {str(e)}")


@router.get("/denoise/{image_id}/download")
async def download_denoised(image_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImageRecord).where(ImageRecord.id == image_id))
    record = result.scalar_one_or_none()
    if not record or not record.denoised_path:
        raise HTTPException(404, "Denoised image not ready")
    if not os.path.exists(record.denoised_path):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(
        record.denoised_path,
        media_type="image/png",
        filename=f"denoised_{record.filename}",
    )


@router.post("/denoise/preview")
async def denoise_preview(
    noise_pct: float = 30,
    sigma: float = 0.15,
    threshold: float = 0.05,
    threshold_method: str = "bayesshrink",
    use_tv: bool = True,
):
    """Synthetic CT image preview — no upload required."""
    H, W = 256, 256
    clean = np.zeros((H, W), dtype=np.uint8)
    layers = [(40, 0.80, 35), (75, 0.75, 55), (110, 0.70, 80),
              (140, 0.65, 110), (165, 0.58, 150), (185, 0.48, 195)]
    for v, ry_r, rx in layers:
        cv2.ellipse(clean, (W//2, H//2), (rx, int(rx*ry_r)), 0, 0, 360, v, -1)
    cv2.ellipse(clean, (W//2 - 28, H//2 + 18), (11, 8), 0.4, 0, 360, 220, -1)
    cv2.ellipse(clean, (W//2 + 20, H//2 - 10), (6, 5), 0, 0, 360, 200, -1)

    noisy = add_gaussian_noise(clean, sigma=noise_pct / 100)
    result = run_denoising_pipeline(
        noisy, original_clean=clean,
        sigma=sigma, threshold=threshold,
        threshold_method=threshold_method,
        use_dncnn=False, use_tv=use_tv,
    )
    return {
        "original":  image_to_base64(clean),
        "noisy":     image_to_base64(noisy),
        "denoised":  image_to_base64(result.denoised),
        "metrics":   {
            "psnr": round(result.psnr, 2),
            "ssim": round(result.ssim, 4),
            "mse":  round(result.mse,  2),
            "snr":  round(result.snr,  2),
        },
        "stage_times": result.stage_times,
    }
