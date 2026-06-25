from sqlalchemy import Column, String, Float, Integer, DateTime, Text
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class ProcessingStatus:
    pending    = "pending"
    processing = "processing"
    complete   = "complete"
    failed     = "failed"


class ImageRecord(Base):
    __tablename__ = "image_records"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename       = Column(String, nullable=False)
    original_path  = Column(String)
    denoised_path  = Column(String)
    noisy_path     = Column(String)

    # Image properties
    width          = Column(Integer, default=512)
    height         = Column(Integer, default=512)
    modality       = Column(String,  default="CT")
    patient_id     = Column(String)
    diagnosis      = Column(String,  default="unknown")

    # Noise
    noise_type        = Column(String, default="gaussian")
    noise_sigma       = Column(Float)
    noise_intensity_pct = Column(Float)

    # Metrics (post-denoising)
    psnr           = Column(Float)
    ssim           = Column(Float)
    mse            = Column(Float)
    snr            = Column(Float)

    # Processing
    status              = Column(String, default=ProcessingStatus.pending)
    processing_time_ms  = Column(Float)
    pipeline_used       = Column(String, default="AGF+Haar+BayesShrink+DnCNN+TV")
    notes               = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
