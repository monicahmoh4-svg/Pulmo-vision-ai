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

    # Storage — default to /tmp which is always writable on Render
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/uploads")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "/tmp/outputs")
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

# Ensure local directories exist — use only /tmp-based or relative paths on Render
def _safe_makedirs(path: str) -> None:
    """Only create the directory if it's a relative path or under /tmp."""
    abs_path = os.path.abspath(path)
    if abs_path.startswith("/tmp") or not os.path.isabs(path):
        os.makedirs(abs_path, exist_ok=True)
    else:
        # Fall back to a /tmp mirror so the app still has a working directory
        fallback = os.path.join("/tmp", os.path.basename(abs_path))
        os.makedirs(fallback, exist_ok=True)


_safe_makedirs(settings.UPLOAD_DIR)
_safe_makedirs(settings.OUTPUT_DIR)
_safe_makedirs("app/models")
