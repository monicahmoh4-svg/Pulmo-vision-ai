"""
LungDenoise AI — FastAPI Backend
Wavelet + AGF + DnCNN + Total Variation Denoising Pipeline
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time

from app.api import ingest, denoise, metrics, batch, health, dataset, enhance
from app.core.config import settings
from app.core.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting LungDenoise AI v%s", settings.VERSION)
    await init_db()
    logger.info("CORS allowed origins: %s", settings.ALLOWED_ORIGINS)
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="LungDenoise AI",
    description="Hospital-grade CT Gaussian noise removal pipeline",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────
# allow_origin_regex covers:
#  - All Vercel preview/branch URLs  (*.vercel.app)
#  - Any subdomain of the custom domain set in FRONTEND_URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    # Regex covers *.vercel.app AND any subdomain of the custom domain
    allow_origin_regex=(
        r"https?://(.*\.)?vercel\.app"
        r"|https?://(www\.)?(pulmovisionai|pulmo-vision-ai)\..*"
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Process-Time-ms"],
    max_age=600,
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ── Request timing header ─────────────────────────────────────────────
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time-ms"] = f"{(time.perf_counter()-t0)*1000:.1f}"
    return response


# ── Global error handler ──────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_error(request: Request, exc: Exception):
    logger.error("Unhandled: %s %s — %s", request.method, request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


# ── Explicit OPTIONS catch-all (belt + suspenders for CORS preflight) ─
@app.options("/{rest_of_path:path}")
async def options_handler(rest_of_path: str):
    return JSONResponse(content={}, status_code=200)


# ── Routers ───────────────────────────────────────────────────────────
app.include_router(health.router,  prefix="/api/v1", tags=["Health"])
app.include_router(ingest.router,  prefix="/api/v1", tags=["Ingest"])
app.include_router(denoise.router, prefix="/api/v1", tags=["Denoise"])
app.include_router(enhance.router, prefix="/api/v1", tags=["Enhance"])
app.include_router(metrics.router, prefix="/api/v1", tags=["Metrics"])
app.include_router(batch.router,   prefix="/api/v1", tags=["Batch"])
app.include_router(dataset.router, prefix="/api/v1", tags=["Dataset"])


@app.get("/")
async def root():
    return {
        "service":  "LungDenoise AI",
        "version":  settings.VERSION,
        "status":   "operational",
        "docs":     "/api/docs",
        "pipeline": "AGF + Haar Wavelet DWT + DnCNN + TV",
    }
