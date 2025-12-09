from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas import StatsResponse
from app.db import get_db
from app.service import get_or_scrape
from app.locales import LOCALES

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
async def stats(
    place_url: str,
    locale: str | None = None,
    exclude_below: float | None = None,
    max_reviews: int = 2000,
    force_refresh: bool = False,
    db: AsyncSession = Depends(get_db),
):
    # Use a single locale for stats; default to en-US
    loc = (locale or "en-US")
    if loc not in LOCALES:
        # Fallback to first available if en-US not configured
        loc = next(iter(LOCALES.keys()))

    payload = await get_or_scrape(
        db,
        str(place_url),
        loc,
        force_refresh,
        1.0,  # include all ratings for base totals
        max_reviews,
        "newest",
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
        place_url=str(place_url),
        locales=[loc],
        totalCount=total_count,
        averageRating=avg_all,
        threshold=exclude_below,
        filteredCount=filtered_count,
        filteredAverage=filtered_avg,
    )

