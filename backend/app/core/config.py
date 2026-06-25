from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "LungDenoise AI"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # CORS — explicit origins only (wildcards break browsers with credentials)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        base = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
        ]
        if self.FRONTEND_URL and self.FRONTEND_URL not in base:
            base.append(self.FRONTEND_URL)
        # Also add common Vercel preview URL patterns explicitly
        extra = os.getenv("EXTRA_ORIGINS", "")
        if extra:
            base.extend([u.strip() for u in extra.split(",") if u.strip()])
        return base

    # Database
    # Dev: sqlite+aiosqlite:///./lungdenoise.db
    # Prod (Neon): postgresql+asyncpg://user:pass@host/db?sslmode=require
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./lungdenoise.db"
    )

    # Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "outputs")
    MAX_FILE_SIZE_MB: int = 50

    # Pipeline defaults
    DEFAULT_NOISE_SIGMA: float = 0.15
    WAVELET_THRESHOLD: float = 0.05
    PATCH_SIZE: int = 45
    IMAGE_SIZE: int = 512
    DWT_LEVEL: int = 2

    # DnCNN
    MODEL_PATH: str = "app/models/dncnn_weights.h5"
    USE_PRETRAINED_DNCNN: bool = False   # set True once trained

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure local directories exist (safe on Render disk mounts)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
os.makedirs("app/models", exist_ok=True)
