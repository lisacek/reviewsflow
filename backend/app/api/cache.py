from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.schemas import CacheEntry, CacheDeleteRequest, RefreshRequest, ReviewsResponse
from app.db import get_db
from app.models import ReviewCache
from app.locales import LOCALES
from app.service import force_refresh_locales
import asyncio

router = APIRouter(prefix="", tags=["cache"])


@router.get("/cache", response_model=list[CacheEntry])
async def get_cache(place_url: str | None = None, locales: list[str] | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(ReviewCache)
    if place_url:
        stmt = stmt.where(ReviewCache.place_url == str(place_url))
    if locales:
        stmt = stmt.where(ReviewCache.locale.in_(locales))
    res = await db.execute(stmt)
    rows = res.scalars().all()
    out: list[CacheEntry] = []
    for r in rows:
        out.append(
            CacheEntry(
                place_url=r.place_url,
                locale=r.locale,
                avg_rating=r.avg_rating or 0.0,
                updated_at=r.updated_at,
                count=(r.payload.get("count") if isinstance(r.payload, dict) else 0),
            )
        )
    return out


@router.delete("/cache")
async def delete_cache(req: CacheDeleteRequest, db: AsyncSession = Depends(get_db)):
    locales = req.locales
    stmt = delete(ReviewCache).where(ReviewCache.place_url == str(req.place_url))
    if locales:
        stmt = stmt.where(ReviewCache.locale.in_(locales))
    await db.execute(stmt)
    await db.commit()
    return {"success": True}


@router.post("/refresh", response_model=list[ReviewsResponse])
async def refresh_reviews(req: RefreshRequest, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Keep same behavior as before: background refresh and return current cache
    locales = req.locales or list(LOCALES.keys())
    locales = [loc for loc in locales if loc in LOCALES]
    if req.background:
        # Lazy import to avoid circulars
        from app.tasks import background_refresh
        background.add_task(background_refresh, str(req.place_url), locales)
        # return current cached state
        stmt = select(ReviewCache).where(ReviewCache.place_url == str(req.place_url))
        if locales:
            stmt = stmt.where(ReviewCache.locale.in_(locales))
        res = await db.execute(stmt)
        rows = res.scalars().all()
        return [r.payload for r in rows]
    else:
        return await force_refresh_locales(db, str(req.place_url), locales, 1.0, 200, "newest")
