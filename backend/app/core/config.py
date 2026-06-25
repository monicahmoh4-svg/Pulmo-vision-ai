from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "LungDenoise AI"
    VERSION:  str = "1.0.0"
    DEBUG:    bool = False

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
        extra = os.getenv("EXTRA_ORIGINS", "")
        if extra:
            base.extend([u.strip() for u in extra.split(",") if u.strip()])
        return base

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./lungdenoise.db"
    )

    # /tmp is always writable on Render; never point to /app
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/uploads")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "/tmp/outputs")
    MAX_FILE_SIZE_MB: int = 50

    DEFAULT_NOISE_SIGMA: float = 0.15
    WAVELET_THRESHOLD:   float = 0.05
    PATCH_SIZE:          int   = 45
    IMAGE_SIZE:          int   = 512
    DWT_LEVEL:           int   = 2

    MODEL_PATH:           str  = "app/models/dncnn_weights.h5"
    USE_PRETRAINED_DNCNN: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


def _safe_makedirs(path: str) -> None:
    """Create directory only if it is /tmp-based or relative — never a system path."""
    abs_path = os.path.abspath(path)
    if abs_path.startswith("/tmp") or not os.path.isabs(path):
        os.makedirs(abs_path, exist_ok=True)
    else:
        fallback = os.path.join("/tmp", os.path.basename(abs_path))
        os.makedirs(fallback, exist_ok=True)
        if path == settings.UPLOAD_DIR:
            settings.UPLOAD_DIR = fallback
        elif path == settings.OUTPUT_DIR:
            settings.OUTPUT_DIR = fallback


_safe_makedirs(settings.UPLOAD_DIR)
_safe_makedirs(settings.OUTPUT_DIR)
_safe_makedirs("app/models")
