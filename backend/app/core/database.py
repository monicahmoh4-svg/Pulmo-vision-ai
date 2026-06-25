"""
Database engine — auto-selects driver from DATABASE_URL.

SQLite  (dev):  sqlite+aiosqlite:///./lungdenoise.db
Neon/PG (prod): postgresql+asyncpg://user:pass@host/db?sslmode=require
"""

import os
import logging
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

logger = logging.getLogger(__name__)

# psycopg2-style params that asyncpg rejects — must be stripped
_PSYCOPG2_ONLY = {
    "sslmode", "sslcert", "sslkey", "sslrootcert", "sslcrl",
    "connect_timeout", "application_name", "options",
}


def _build_url(raw: str) -> str:
    if not raw:
        return "sqlite+aiosqlite:///./lungdenoise.db"

    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql+asyncpg://", 1)
    elif raw.startswith("postgresql://") and "+asyncpg" not in raw:
        raw = raw.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "sqlite" in raw:
        return raw

    parsed = urlparse(raw)
    if parsed.query:
        qs = parse_qs(parsed.query, keep_blank_values=True)
        qs_clean = {k: v for k, v in qs.items() if k not in _PSYCOPG2_ONLY}
        parsed = parsed._replace(query=urlencode(qs_clean, doseq=True))
        raw = urlunparse(parsed)

    return raw


_raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./lungdenoise.db")
_db_url  = _build_url(_raw_url)
_is_pg   = "postgresql" in _db_url

logger.info("Database driver: %s", "PostgreSQL/Neon" if _is_pg else "SQLite")

engine = create_async_engine(
    _db_url,
    echo=False,
    poolclass=NullPool if _is_pg else None,
    connect_args={"ssl": "require"} if _is_pg else {},
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    from app.models import image_record  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialised.")


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
