"""Health check — also exposes system info for the frontend status indicator."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timezone
import sys, os

from app.core.database import get_db
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    """Deep health check: app + database connectivity."""
    db_ok = False
    db_type = "unknown"
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
        url = os.getenv("DATABASE_URL", "sqlite")
        db_type = "postgresql" if "postgresql" in url or "postgres" in url else "sqlite"
    except Exception as e:
        db_type = f"error: {e}"

    return {
        "status": "ok" if db_ok else "degraded",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {"connected": db_ok, "type": db_type},
        "python": sys.version.split()[0],
        "pipeline": "AGF + Haar DWT + DnCNN",
    }


@router.get("/health/ping")
async def ping():
    """Lightweight ping — no DB check."""
    return {"ping": "pong", "ts": datetime.now(timezone.utc).isoformat()}
