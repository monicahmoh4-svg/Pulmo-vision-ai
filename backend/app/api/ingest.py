"""Data ingestion — upload CT scans (DICOM / PNG / JPG)."""
import uuid, os, logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.config import settings
from app.models.image_record import ImageRecord, ProcessingStatus
from app.services.image_service import (
    load_image_from_bytes, preprocess_image,
    save_image, get_image_stats, image_to_base64,
)
from app.services.denoising_pipeline import estimate_noise_wavelet

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


@router.post("/ingest")
async def ingest_image(
    file: UploadFile = File(...),
    patient_id: str = "",
    diagnosis: str = "unknown",
    db: AsyncSession = Depends(get_db),
):
    """Upload and preprocess a CT scan image."""
    # Read first — size may be None until data is fully read
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit")
    if not data:
        raise HTTPException(422, "Empty file")

    try:
        raw   = load_image_from_bytes(data, file.filename or "")
        image = preprocess_image(raw, (settings.IMAGE_SIZE, settings.IMAGE_SIZE))
    except Exception as e:
        raise HTTPException(422, f"Cannot process image: {e}")

    record_id = str(uuid.uuid4())
    orig_path = os.path.join(settings.UPLOAD_DIR, f"{record_id}_original.png")
    save_image(image, orig_path)

    sigma = float(estimate_noise_wavelet(image))
    stats = get_image_stats(image)

    record = ImageRecord(
        id=record_id,
        filename=file.filename or "upload.png",
        original_path=orig_path,
        patient_id=patient_id or f"PT-{record_id[:6].upper()}",
        diagnosis=diagnosis,
        noise_sigma=round(sigma, 4),
        width=stats["width"],
        height=stats["height"],
        status=ProcessingStatus.pending,
    )
    db.add(record)
    await db.commit()

    return {
        "id":          record_id,
        "filename":    file.filename,
        "status":      "pending",
        "noise_sigma": round(sigma, 4),
        "preview":     image_to_base64(image),
        "stats":       stats,
        "patient_id":  record.patient_id,
    }


@router.get("/images")
async def list_images(
    limit:  int = Query(50, ge=1, le=200),
    offset: int = Query(0,  ge=0),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ImageRecord)
        .order_by(desc(ImageRecord.created_at))
        .limit(limit)
        .offset(offset)
    )
    records = result.scalars().all()
    return [
        {
            "id":                  r.id,
            "filename":            r.filename,
            "status":              r.status,
            "psnr":                r.psnr,
            "ssim":                r.ssim,
            "mse":                 r.mse,
            "snr":                 r.snr,
            "noise_sigma":         r.noise_sigma,
            "diagnosis":           r.diagnosis,
            "patient_id":          r.patient_id,
            "width":               r.width,
            "height":              r.height,
            "pipeline_used":       r.pipeline_used,
            "processing_time_ms":  r.processing_time_ms,
            "noise_intensity_pct": r.noise_intensity_pct,
            "created_at":          r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get("/images/{image_id}")
async def get_image(image_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImageRecord).where(ImageRecord.id == image_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found")
    return {
        "id":                  record.id,
        "filename":            record.filename,
        "status":              record.status,
        "psnr":                record.psnr,
        "ssim":                record.ssim,
        "mse":                 record.mse,
        "snr":                 record.snr,
        "noise_sigma":         record.noise_sigma,
        "diagnosis":           record.diagnosis,
        "patient_id":          record.patient_id,
        "width":               record.width,
        "height":              record.height,
        "pipeline_used":       record.pipeline_used,
        "processing_time_ms":  record.processing_time_ms,
        "noise_intensity_pct": record.noise_intensity_pct,
        "created_at":          record.created_at.isoformat() if record.created_at else None,
    }


@router.delete("/images/{image_id}")
async def delete_image(image_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImageRecord).where(ImageRecord.id == image_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found")
    for path in [record.original_path, record.denoised_path, record.noisy_path]:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
    await db.delete(record)
    await db.commit()
    return {"deleted": image_id}
