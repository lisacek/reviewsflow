from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, update
from datetime import datetime, timezone
import asyncio
import sys

from app.db import engine, Base, AsyncSessionLocal
from app.models import ReviewCache, User
from app.config import settings
from app.auth import hash_password
from app.api import core as api_core
from app.api import auth_routes as api_auth
from app.api import reviews as api_reviews
from app.api import public as api_public
from app.api import cache as api_cache
from app.api import monitors as api_monitors
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
app.include_router(api_reviews.router)
app.include_router(api_public.router)
app.include_router(api_cache.router)
app.include_router(api_monitors.router)
app.include_router(api_domains.router)
app.include_router(api_instances.router)
app.include_router(api_stats.router)
app.include_router(api_private.router)

