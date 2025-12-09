from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from app.schemas import ScrapeRequest, ReviewsResponse
from app.db import get_db
from app.service import get_or_scrape
from app.locales import LOCALES
from app.config import settings

router = APIRouter(tags=["reviews"])


@router.post("/reviews", response_model=list[ReviewsResponse])
async def fetch_reviews(
    req: ScrapeRequest,
    db: AsyncSession = Depends(get_db),
):
    locales = req.locales or settings.DEFAULT_LOCALES or list(LOCALES.keys())
    tasks = [
        get_or_scrape(
            db,
            req.place_url,
            loc,
            req.force_refresh,
            req.min_rating,
            req.max_reviews,
            req.sort,
        )
        for loc in locales
        if loc in LOCALES
    ]
    return await asyncio.gather(*tasks)

