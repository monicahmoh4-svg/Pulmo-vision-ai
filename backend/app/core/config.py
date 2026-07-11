from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "LungDenoise AI"
    VERSION:  str = "1.0.0"
    DEBUG:    bool = False

    # Set this on Render to your custom domain (comma-separated if multiple)
    # e.g. FRONTEND_URL=https://pulmovisionai.com,https://www.pulmovisionai.com
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        origins = set([
            # Local dev
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            # Vercel deployment URLs (covers pulmo-vision-ai.vercel.app)
            "https://pulmo-vision-ai.vercel.app",
            "https://pulmo-vision-ai-git-main-monicahmoh4-svg.vercel.app",
        ])

        # Parse FRONTEND_URL — supports comma-separated list of domains
        if self.FRONTEND_URL:
            for url in self.FRONTEND_URL.split(","):
                url = url.strip().rstrip("/")
                if url:
                    origins.add(url)
                    # Also add www. variant automatically
                    if url.startswith("https://") and not url.startswith("https://www."):
                        origins.add(url.replace("https://", "https://www.", 1))
                    # Also add http:// variant for redirect chains
                    if url.startswith("https://"):
                        origins.add(url.replace("https://", "http://", 1))

        # EXTRA_ORIGINS env var — additional comma-separated origins
        extra = os.getenv("EXTRA_ORIGINS", "")
        if extra:
            for url in extra.split(","):
                url = url.strip().rstrip("/")
                if url:
                    origins.add(url)

        return list(origins)

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./lungdenoise.db"
    )

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
        extra    = "ignore"


settings = Settings()


def _safe_makedirs(path: str) -> None:
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
