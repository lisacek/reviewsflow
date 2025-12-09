from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio

from app.schemas import ReviewsResponse
from app.db import get_db
from app.models import ReviewInstance, Domain
from app.service import get_or_scrape
from app.locales import LOCALES
from app.config import settings

router = APIRouter(prefix="/public", tags=["public"])


def _origin_host(request: Request) -> str | None:
    origin = request.headers.get("origin") or request.headers.get("referer")
    if not origin:
        return None
    try:
        if "//" in origin:
            host = origin.split("//", 1)[1]
        else:
            host = origin
        host = host.split("/", 1)[0]
        return host.split(":", 1)[0].lower()
    except Exception:
        return None


@router.get("/reviews/{public_key}", response_model=list[ReviewsResponse])
async def public_reviews(public_key: str, request: Request, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ReviewInstance).where(ReviewInstance.public_key == public_key, ReviewInstance.active == True))
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Enforce domain allowlist if present
    res = await db.execute(select(Domain).where(Domain.user_id == inst.user_id, Domain.active == True))
    domains = res.scalars().all()
    if domains:
        host = _origin_host(request)
        allowed = {d.host.lower() for d in domains}
        if not host or all((h not in host and host not in h) for h in allowed):
            raise HTTPException(status_code=403, detail="Origin not allowed")

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
        for loc in locales if loc in LOCALES
    ]
    return await asyncio.gather(*tasks)

