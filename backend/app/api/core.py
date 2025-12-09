from fastapi import APIRouter
from app.config import settings
from app.locales import LOCALES

router = APIRouter()


@router.get("/health")
async def health():
    # Version is set on FastAPI app; expose settings values here
    return {"status": "ok", "version": "1.1.0", "workers": settings.WORKER_COUNT}


@router.get("/locales")
async def list_locales():
    return sorted(list(LOCALES.keys()))


@router.get("/config")
async def get_config():
    return {
        "DATABASE_URL": settings.DATABASE_URL,
        "HEADLESS": settings.HEADLESS,
        "MIN_RATING": settings.MIN_RATING,
        "CACHE_TTL_MINUTES": settings.CACHE_TTL_MINUTES,
        "MONITOR_POLL_SECONDS": settings.MONITOR_POLL_SECONDS,
        "WORKER_COUNT": settings.WORKER_COUNT,
        "MAX_PLAYWRIGHT_INSTANCES": settings.MAX_PLAYWRIGHT_INSTANCES,
        "DEFAULT_LOCALES": settings.DEFAULT_LOCALES,
        "ALLOW_REGISTRATIONS": settings.ALLOW_REGISTRATIONS,
    }

