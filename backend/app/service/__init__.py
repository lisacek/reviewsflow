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
    max_reviews: int | None,
    sort: str,
):
    place_url_str = str(place_url)

    q = await db.execute(
        select(ReviewCache)
        .where(ReviewCache.place_url == place_url_str, ReviewCache.locale == locale)
        .order_by(ReviewCache.updated_at.desc(), ReviewCache.id.desc())
    )
    cached = q.scalars().first()

    if cached and not force:
        # Determine if cached payload can satisfy current request (allow supersets)
        def _satisfies_request(p: dict) -> tuple[bool, dict]:
            try:
                params = p.get("params", {}) if isinstance(p, dict) else {}
                if not params:
                    return False, {}
                if params.get("sort") != sort:
                    return False, params
                try:
                    cached_min = float(params.get("min_rating", 1.0))
                    req_min = float(min_rating)
                    # Superset rule: cached_min must be <= requested_min
                    if cached_min > req_min:
                        return False, params
                except Exception:
                    return False, params
                try:
                    # Cached can satisfy if it has at least as many as requested (0 means infinite)
                    def _norm(v):
                        try:
                            iv = int(v)
                            return float('inf') if iv <= 0 else iv
                        except Exception:
                            return 0
                    cached_max = _norm(params.get("max_reviews", 0))
                    req_max = _norm(max_reviews if max_reviews is not None else 0)
                    if cached_max < req_max:
                        return False, params
                except Exception:
                    return False, params
                return True, params
            except Exception:
                return False, {}

        needs_refresh = False
        # TTL check with robust timezone handling
        now = datetime.now(timezone.utc)
        updated = cached.updated_at
        if updated is None:
            needs_refresh = True
            print(f"[CACHE] MISS reason=missing_updated_at locale={locale}")
        else:
            try:
                if updated.tzinfo is None:
                    # Treat naive as UTC
                    updated_cmp = updated.replace(tzinfo=timezone.utc)
                else:
                    updated_cmp = updated
                age = (now - updated_cmp)
                if age > timedelta(minutes=settings.CACHE_TTL_MINUTES):
                    needs_refresh = True
                    print(f"[CACHE] STALE age_minutes={int(age.total_seconds()/60)} ttl={settings.CACHE_TTL_MINUTES} locale={locale}")
            except Exception:
                # On any issue comparing, do not force refresh unnecessarily; assume fresh
                needs_refresh = False

        sat, cparams = _satisfies_request(cached.payload)
        if not sat:
            needs_refresh = True
            print(f"[CACHE] PARAM_MISMATCH locale={locale} want sort={sort} min_rating={min_rating} max_reviews={max_reviews} got={cparams}")

        if needs_refresh:
            print(f"[CACHE] REFRESH locale={locale} place={place_url_str}")
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
                    "max_reviews": int(max_reviews) if (max_reviews is not None and int(max_reviews) > 0) else 0,
                    "sort": str(sort),
                },
            }
            # Upsert by (place_url, locale) without relying on merge to avoid duplicates
            existing_q = await db.execute(
                select(ReviewCache)
                .where(ReviewCache.place_url == place_url_str, ReviewCache.locale == locale)
                .order_by(ReviewCache.updated_at.desc(), ReviewCache.id.desc())
            )
            existing = existing_q.scalars().first()
            if existing:
                existing.payload = payload
                existing.avg_rating = payload["averageRating"]
                existing.updated_at = datetime.now(timezone.utc)
                db.add(existing)
            else:
                db.add(
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

        print(f"[CACHE] HIT locale={locale} place={place_url_str}")
        # If cached is a superset, derive filtered/sliced view for requested params
        try:
            payload = cached.payload if isinstance(cached.payload, dict) else {}
            cparams = payload.get("params", {}) if isinstance(payload.get("params"), dict) else {}
            # Exact param match -> return as-is
            try:
                req_max_i = int(max_reviews) if (max_reviews is not None and int(max_reviews) > 0) else 0
                exact = (
                    cparams.get("sort") == str(sort)
                    and float(cparams.get("min_rating", 1.0)) == float(min_rating)
                    and int(cparams.get("max_reviews", 0)) == req_max_i
                )
            except Exception:
                exact = False
            if exact:
                return payload

            reviews = payload.get("reviews") or []
            try:
                filtered = [r for r in reviews if float(r.get("stars", 0)) >= float(min_rating)]
            except Exception:
                filtered = reviews
            try:
                if req_max_i and req_max_i > 0:
                    trimmed = list(filtered)[: req_max_i]
                else:
                    trimmed = list(filtered)
            except Exception:
                trimmed = list(filtered)
            avg = round((sum((r.get("stars") or 0) for r in trimmed) / max(len(trimmed), 1)), 2) if trimmed else 0.0
            derived = {
                "success": True,
                "locale": payload.get("locale", locale),
                "count": len(trimmed),
                "averageRating": avg,
                "reviews": trimmed,
                "params": {
                    "min_rating": float(min_rating),
                    "max_reviews": int(max_reviews) if (max_reviews is not None and int(max_reviews) > 0) else 0,
                    "sort": str(sort),
                },
            }
            print(f"[CACHE] DERIVED locale={locale} from params={cparams} -> min={min_rating} max={max_reviews} sort={sort}")
            return derived
        except Exception:
            return cached.payload

    print(f"[CACHE] COLD_MISS locale={locale} place={place_url_str}")
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
                    "max_reviews": req_max_i,
                    "sort": str(sort),
                },
    }

    # Upsert by (place_url, locale)
    existing_q = await db.execute(
        select(ReviewCache)
        .where(ReviewCache.place_url == place_url_str, ReviewCache.locale == locale)
        .order_by(ReviewCache.updated_at.desc(), ReviewCache.id.desc())
    )
    existing = existing_q.scalars().first()
    if existing:
        existing.payload = payload
        existing.avg_rating = payload["averageRating"]
        existing.updated_at = datetime.now(timezone.utc)
        db.add(existing)
    else:
        db.add(
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

