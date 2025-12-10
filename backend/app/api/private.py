from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas import ReviewsResponse, StatsResponse
from app.db import get_db
from app.models import ReviewInstance, User
from app.auth import get_current_user
from app.service import get_or_scrape
from app.locales import LOCALES
from app.config import settings

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/reviews/{instance_id}", response_model=list[ReviewsResponse])
async def api_reviews(
    instance_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ReviewInstance).where(
            ReviewInstance.id == instance_id,
            ReviewInstance.user_id == user.id,
            ReviewInstance.active == True,
        )
    )
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    locales = inst.locales or settings.DEFAULT_LOCALES or ["en-US"]
    tasks = [
        get_or_scrape(
            db,
            inst.place_url,
            loc,
            False,
            inst.min_rating,
            inst.max_reviews,
            inst.sort,
        )
        for loc in locales
        if loc in LOCALES
    ]
    import asyncio
    return await asyncio.gather(*tasks)


@router.get("/stats/{instance_id}", response_model=StatsResponse)
async def api_stats(
    instance_id: int,
    locale: str | None = None,
    exclude_below: float | None = None,
    max_reviews: int | None = None,
    force_refresh: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ReviewInstance).where(
            ReviewInstance.id == instance_id,
            ReviewInstance.user_id == user.id,
            ReviewInstance.active == True,
        )
    )
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Pick locale: explicit > instance locales[0] > en-US > any available
    loc = locale or (inst.locales[0] if (inst.locales or []) else None) or "en-US"
    if loc not in LOCALES:
        # Fallback to first available
        loc = next(iter(LOCALES.keys()))

    # For stats, collect all available reviews (max_reviews=0 means "all")
    payload = await get_or_scrape(
        db,
        inst.place_url,
        loc,
        force_refresh,
        1.0,
        0,
        inst.sort,
    )

    stars: list[float] = []
    try:
        for r in payload.get("reviews", []):
            s = r.get("stars")
            if isinstance(s, (int, float)):
                stars.append(float(s))
    except Exception:
        pass

    total_count = len(stars)
    avg_all = round((sum(stars) / total_count), 2) if total_count else 0.0

    filtered_count = None
    filtered_avg = None
    if exclude_below is not None:
        filtered = [s for s in stars if s >= float(exclude_below)]
        filtered_count = len(filtered)
        filtered_avg = round((sum(filtered) / filtered_count), 2) if filtered_count else 0.0

    return StatsResponse(
        success=True,
        place_url=inst.place_url,
        locales=[loc],
        totalCount=total_count,
        averageRating=avg_all,
        threshold=exclude_below,
        filteredCount=filtered_count,
        filteredAverage=filtered_avg,
    )

