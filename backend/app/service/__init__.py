from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import ReviewCache
from app.scraper import scrape
from app.locales import LOCALES
from app.config import settings
from datetime import datetime, timedelta, timezone
import asyncio

_SCRAPE_SEM = asyncio.Semaphore(max(1, int(getattr(settings, "MAX_PLAYWRIGHT_INSTANCES", 2))))


async def get_or_scrape(
    db: AsyncSession,
    place_url,
    locale: str,
    force: bool,
    min_rating: float,
    max_reviews: int,
    sort: str,
):
    place_url_str = str(place_url)

    q = await db.execute(
        select(ReviewCache).where(
            ReviewCache.place_url == place_url_str,
            ReviewCache.locale == locale,
        )
    )
    cached = q.scalars().first()

    if cached and not force:
        # Determine if cached payload satisfies current request
        def _satisfies_request(p: dict) -> bool:
            try:
                params = p.get("params", {}) if isinstance(p, dict) else {}
                if not params:
                    return False
                if params.get("sort") != sort:
                    return False
                try:
                    if float(params.get("min_rating", 1.0)) != float(min_rating):
                        return False
                except Exception:
                    return False
                try:
                    # Cached can satisfy if it has at least as many as requested
                    if int(params.get("max_reviews", 0)) < int(max_reviews):
                        return False
                except Exception:
                    return False
                return True
            except Exception:
                return False

        needs_refresh = False
        # TTL check with robust timezone handling
        now = datetime.now(timezone.utc)
        updated = cached.updated_at
        if updated is None:
            needs_refresh = True
        else:
            try:
                if updated.tzinfo is None:
                    # Treat naive as UTC
                    updated_cmp = updated.replace(tzinfo=timezone.utc)
                else:
                    updated_cmp = updated
                if (now - updated_cmp) > timedelta(minutes=settings.CACHE_TTL_MINUTES):
                    needs_refresh = True
            except Exception:
                # On any issue comparing, do not force refresh unnecessarily; assume fresh
                needs_refresh = False

        if not _satisfies_request(cached.payload):
            needs_refresh = True

        if needs_refresh:
            async with _SCRAPE_SEM:
                reviews = await scrape(
                    place_url_str,
                    locale,
                    LOCALES[locale],
                    min_rating,
                    max_reviews,
                    sort,
                )
            payload = {
                "success": True,
                "locale": locale,
                "count": len(reviews),
                "averageRating": round(
                    sum(r["stars"] for r in reviews) / max(len(reviews), 1), 2
                ),
                "reviews": reviews,
                "params": {
                    "min_rating": float(min_rating),
                    "max_reviews": int(max_reviews),
                    "sort": str(sort),
                },
            }
            await db.merge(
                ReviewCache(
                    place_url=place_url_str,
                    locale=locale,
                    payload=payload,
                    avg_rating=payload["averageRating"],
                    updated_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()
            return payload

        return cached.payload

    async with _SCRAPE_SEM:
        reviews = await scrape(
            place_url_str,
            locale,
            LOCALES[locale],
            min_rating,
            max_reviews,
            sort,
        )

    payload = {
        "success": True,
        "locale": locale,
        "count": len(reviews),
        "averageRating": round(
            sum(r["stars"] for r in reviews) / max(len(reviews), 1), 2
        ),
        "reviews": reviews,
        "params": {
            "min_rating": float(min_rating),
            "max_reviews": int(max_reviews),
            "sort": str(sort),
        },
    }

    await db.merge(
        ReviewCache(
            place_url=place_url_str,
            locale=locale,
            payload=payload,
            avg_rating=payload["averageRating"],
            updated_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()
    return payload


async def force_refresh_locales(
    db: AsyncSession,
    place_url: str,
    locales: list[str],
    min_rating: float,
    max_reviews: int,
    sort: str,
):
    results = []
    for loc in locales:
        if loc not in LOCALES:
            continue
        payload = await get_or_scrape(
            db,
            place_url,
            loc,
            True,  # force
            min_rating,
            max_reviews,
            sort,
        )
        results.append(payload)
    return results

