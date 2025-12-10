from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from app.models import ReviewCache, ReviewEntry
from app.scraper import scrape
from app.locales import LOCALES
from app.config import settings
from datetime import datetime, timedelta, timezone
import asyncio

_SCRAPE_SEM = asyncio.Semaphore(max(1, int(getattr(settings, "MAX_PLAYWRIGHT_INSTANCES", 2))))

# Temporary: force serving reviews from earliest added -> newest added, regardless of requested sort
FORCE_OLDEST_ORDER = True

# Per-key lock to avoid concurrent scrapes for the same (place_url, locale)
_SCRAPE_LOCKS: dict[str, asyncio.Lock] = {}


def _scrape_key(place_url: str, locale: str) -> str:
    return f"{place_url}::{locale}"


def _get_lock(key: str) -> asyncio.Lock:
    lk = _SCRAPE_LOCKS.get(key)
    if lk is None:
        lk = asyncio.Lock()
        _SCRAPE_LOCKS[key] = lk
    return lk


async def _build_payload_from_db(db: AsyncSession, place_url: str, locale: str, min_rating: float, max_reviews: int | None, sort: str, initial_seed: bool = False) -> dict:
    # Temporary behavior: always serve from earliest added to newest (oldest first)
    if FORCE_OLDEST_ORDER:
        order = [ReviewEntry.scraped_at.asc(), ReviewEntry.id.asc()]
    else:
        # Original behavior: newest first except initial seed for newest
        if sort == "newest" and initial_seed:
            order = [ReviewEntry.scraped_at.asc(), ReviewEntry.id.asc()]
        else:
            order = [ReviewEntry.scraped_at.desc(), ReviewEntry.id.desc()]
    q = await db.execute(
        select(ReviewEntry)
        .where(ReviewEntry.place_url == place_url, ReviewEntry.locale == locale)
        .order_by(*order)
    )
    rows = q.scalars().all()
    try:
        print(f"[DB] Found {len(rows)} stored reviews for place={place_url} locale={locale}")
    except Exception:
        pass
    items = []
    for r in rows:
        # Skip hidden items
        try:
            if getattr(r, 'hidden', False):
                continue
        except Exception:
            pass
        try:
            if r.stars is not None and float(r.stars) < float(min_rating):
                continue
        except Exception:
            pass
        items.append({
            "reviewId": r.review_id,
            "name": r.name or "",
            "date": r.date or "",
            "stars": float(r.stars or 0.0),
            "text": r.text or "",
            "avatar": r.avatar or "",
            "profileLink": r.profile_link or "",
        })
    if not FORCE_OLDEST_ORDER:
        if sort == "best":
            items.sort(key=lambda x: x["stars"], reverse=True)
        elif sort == "worst":
            items.sort(key=lambda x: x["stars"]) 
        elif sort == "oldest":
            items = list(reversed(items))
    if max_reviews and int(max_reviews) > 0:
        items = items[: int(max_reviews)]
    avg = round((sum(x["stars"] for x in items) / max(len(items), 1)), 2) if items else 0.0
    try:
        print(f"[DB] Serving {len(items)} reviews (min={min_rating}, max={max_reviews}, sort={sort}) for place={place_url} locale={locale}")
    except Exception:
        pass
    return {
        "success": True,
        "locale": locale,
        "count": len(items),
        "averageRating": avg,
        "reviews": items,
        "params": {
            "min_rating": float(min_rating),
            "max_reviews": int(max_reviews) if (max_reviews is not None and int(max_reviews) > 0) else 0,
            "sort": str(sort),
        },
    }


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

    # TTL marker from ReviewCache
    q = await db.execute(
        select(ReviewCache)
        .where(ReviewCache.place_url == place_url_str, ReviewCache.locale == locale)
        .order_by(ReviewCache.updated_at.desc(), ReviewCache.id.desc())
    )
    cached = q.scalars().first()
    needs_refresh = force
    now = datetime.now(timezone.utc)
    initial_seed = False
    if not needs_refresh:
        if not cached or cached.updated_at is None:
            needs_refresh = True
            initial_seed = True
        else:
            try:
                updated_cmp = cached.updated_at.replace(tzinfo=timezone.utc) if cached.updated_at.tzinfo is None else cached.updated_at
                if (now - updated_cmp) > timedelta(minutes=settings.CACHE_TTL_MINUTES):
                    needs_refresh = True
            except Exception:
                needs_refresh = False

    if needs_refresh:
        key = _scrape_key(place_url_str, locale)
        lock = _get_lock(key)
        if lock.locked():
            try:
                print(f"[LOCK] waiting key={key}")
            except Exception:
                pass
        async with lock:
            try:
                print(f"[LOCK] acquired key={key}")
            except Exception:
                pass
            # Double-check TTL after acquiring lock
            q2 = await db.execute(
                select(ReviewCache)
                .where(ReviewCache.place_url == place_url_str, ReviewCache.locale == locale)
                .order_by(ReviewCache.updated_at.desc(), ReviewCache.id.desc())
            )
            cached2 = q2.scalars().first()
            still_refresh = True
            if cached2 and cached2.updated_at is not None:
                try:
                    updated_cmp2 = cached2.updated_at.replace(tzinfo=timezone.utc) if cached2.updated_at.tzinfo is None else cached2.updated_at
                    still_refresh = (now - updated_cmp2) > timedelta(minutes=settings.CACHE_TTL_MINUTES)
                except Exception:
                    still_refresh = False
            if not force and not still_refresh:
                try:
                    print(f"[LOCK] skip scrape; cache fresh key={key}")
                except Exception:
                    pass
            else:
                async with _SCRAPE_SEM:
                    new_reviews = await scrape(
                        place_url_str,
                        locale,
                        LOCALES[locale],
                        1.0,
                        0,
                        sort,
                    )
                try:
                    print(f"[SCRAPER] Collected {len(new_reviews)} reviews for place={place_url_str} locale={locale}")
                except Exception:
                    pass
                # Insert unique
                existing_q = await db.execute(
                    select(ReviewEntry.review_id).where(ReviewEntry.place_url == place_url_str, ReviewEntry.locale == locale)
                )
                existing_ids = set(existing_q.scalars().all())
                to_add = []
                for r in new_reviews:
                    rid = str(r.get("reviewId") or "")
                    if not rid or rid in existing_ids:
                        continue
                    entry = ReviewEntry(
                        place_url=place_url_str,
                        locale=locale,
                        review_id=rid,
                        name=r.get("name") or "",
                        date=r.get("date") or "",
                        stars=float(r.get("stars") or 0.0),
                        text=r.get("text") or "",
                        avatar=r.get("avatar") or "",
                        profile_link=r.get("profileLink") or "",
                        scraped_at=now,
                    )
                    to_add.append(entry)
                if to_add:
                    db.add_all(to_add)
                    try:
                        print(f"[DB] Inserted {len(to_add)} new reviews for place={place_url_str} locale={locale}")
                    except Exception:
                        pass
                if cached2:
                    cached2.updated_at = now
                    db.add(cached2)
                else:
                    db.add(ReviewCache(place_url=place_url_str, locale=locale, payload={}, avg_rating=0.0, updated_at=now))
                await db.commit()

    return await _build_payload_from_db(db, place_url_str, locale, min_rating, max_reviews, sort, initial_seed=initial_seed)


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
            True,
            min_rating,
            max_reviews,
            sort,
        )
        results.append(payload)
    return results
