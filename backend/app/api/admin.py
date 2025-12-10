from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timedelta, timezone

from app.db import get_db
from app.auth import get_current_admin
from app.models import ReviewEntry, ReviewCache


router = APIRouter(prefix="/admin", tags=["admin"])


class CleanupRequest(BaseModel):
    delete_reviews: bool = True
    delete_cache: bool = True
    place_url: Optional[str] = None
    locales: Optional[List[str]] = None
    older_than_days: Optional[int] = None  # if None, delete all matching


@router.post("/cleanup")
async def cleanup_data(
    req: CleanupRequest,
    _: None = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_reviews = 0
    total_cache = 0

    cutoff: Optional[datetime] = None
    if req.older_than_days is not None:
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=int(req.older_than_days))
        except Exception:
            cutoff = None

    if req.delete_reviews:
        stmt = delete(ReviewEntry)
        if req.place_url:
            stmt = stmt.where(ReviewEntry.place_url == str(req.place_url))
        if req.locales:
            stmt = stmt.where(ReviewEntry.locale.in_(req.locales))
        if cutoff is not None:
            stmt = stmt.where(ReviewEntry.scraped_at < cutoff)
        res = await db.execute(stmt)
        total_reviews = res.rowcount or 0

    if req.delete_cache:
        stmt = delete(ReviewCache)
        if req.place_url:
            stmt = stmt.where(ReviewCache.place_url == str(req.place_url))
        if req.locales:
            stmt = stmt.where(ReviewCache.locale.in_(req.locales))
        res = await db.execute(stmt)
        total_cache = res.rowcount or 0

    await db.commit()
    return {"success": True, "deleted": {"reviews": total_reviews, "cache": total_cache}}

