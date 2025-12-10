from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException
from sqlalchemy import select, update
from datetime import datetime, timezone
import asyncio
import sys
import logging
import traceback
import uuid

from app.db import engine, Base, AsyncSessionLocal
from app.models import ReviewCache, User
from app.config import settings
from app.auth import hash_password
from app.api import core as api_core
from app.api import auth_routes as api_auth
from app.api import public as api_public
from app.api import cache as api_cache
from app.api import domains as api_domains
from app.api import instances as api_instances
from app.api import stats as api_stats
from app.api import private as api_private
from app.tasks import monitor_loop


if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass


app = FastAPI(title="Maps Reviews API", version="1.1.0")

# Allow all origins (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Configure basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("reviewsflow")


@app.middleware("http")
async def add_request_id_and_handle_errors(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    try:
        response = await call_next(request)
    except HTTPException as he:
        payload = {
            "success": False,
            "error": {
                "code": f"http_{he.status_code}",
                "message": he.detail if hasattr(he, "detail") else "HTTP error",
            },
            "requestId": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return JSONResponse(status_code=he.status_code, content=payload)
    except Exception as ex:
        # Handle scraper errors explicitly to return helpful message + screenshot
        try:
            from app.scraper import ScrapeError  # local import to avoid cycles
        except Exception:
            ScrapeError = None  # type: ignore

        if ScrapeError is not None and isinstance(ex, ScrapeError):
            payload = {
                "success": False,
                "error": {
                    "code": "scrape_failed",
                    "message": getattr(ex, "message", "Scraping failed"),
                    "screenshot": getattr(ex, "screenshot", None),
                },
                "requestId": request_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            return JSONResponse(status_code=502, content=payload)

        # Log with traceback and request id
        logger.error("Unhandled exception %s\n%s", request_id, traceback.format_exc())
        payload = {
            "success": False,
            "error": {
                "code": "internal_error",
                "message": "An unexpected error occurred. Please try again later.",
            },
            "requestId": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return JSONResponse(status_code=500, content=payload)

    # Attach request id header for success responses too
    try:
        response.headers["X-Request-ID"] = request_id
    except Exception:
        pass
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    payload = {
        "success": False,
        "error": {
            "code": "validation_error",
            "message": "Request validation failed",
            "details": exc.errors(),
        },
        "requestId": request_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(status_code=422, content=payload)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # background monitor loop
    asyncio.create_task(monitor_loop())
    # Backfill cache timestamps if missing (prevents unnecessary refresh)
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(ReviewCache)
                .where(ReviewCache.updated_at == None)  # noqa: E711
                .values(updated_at=datetime.now(timezone.utc))
            )
            await db.commit()
    except Exception:
        pass
    # Bootstrap admin if registrations are disabled and no users exist
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        any_user = res.scalars().first()
        if not any_user and not settings.ALLOW_REGISTRATIONS:
            if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
                u = User(email=settings.ADMIN_EMAIL, password_hash=hash_password(settings.ADMIN_PASSWORD), is_admin=True)
                db.add(u)
                await db.commit()
            else:
                # No users and registrations disabled; provide warning only
                pass


# Include routers
app.include_router(api_core.router)
app.include_router(api_auth.router)
app.include_router(api_public.router)
app.include_router(api_cache.router)
app.include_router(api_domains.router)
app.include_router(api_instances.router)
app.include_router(api_stats.router)
app.include_router(api_private.router)

