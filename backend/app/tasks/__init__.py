import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.db import AsyncSessionLocal
from app.models import ReviewInstance, MonitoredPlace
from app.service import force_refresh_locales
from app.locales import LOCALES
from app.config import settings


async def background_refresh(place_url: str, locales: list[str]):
    async with AsyncSessionLocal() as db:
        await force_refresh_locales(db, place_url, locales, 1.0, 200, "newest")


async def warm_instance(instance_id: int):
    try:
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(ReviewInstance).where(ReviewInstance.id == instance_id))
            inst = res.scalars().first()
            if not inst or not inst.active:
                return
            locales = [loc for loc in (inst.locales or settings.DEFAULT_LOCALES or ["en-US"]) if loc in LOCALES]
            await force_refresh_locales(
                db,
                inst.place_url,
                locales or ["en-US"],
                1.0,            # scrape generously
                0,              # collect-all
                inst.sort,
            )
            inst.last_run = datetime.now(timezone.utc)
            db.add(inst)
            await db.commit()
    except Exception:
        # best-effort warmup
        pass


async def monitor_loop():
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)
                res = await db.execute(select(MonitoredPlace))
                monitors = res.scalars().all()
                for m in monitors:
                    due = False
                    if m.last_run is None:
                        due = True
                    else:
                        mr = m.last_run
                        try:
                            delta = now - mr
                        except Exception:
                            mr = mr.replace(tzinfo=timezone.utc)
                            delta = now - mr
                        due = delta > timedelta(minutes=m.interval_minutes)
                    if due:
                        locales = [loc for loc in (m.locales or []) if loc in LOCALES]
                        await force_refresh_locales(
                            db,
                            m.place_url,
                            locales or list(LOCALES.keys()),
                            1.0,
                            0,
                            m.sort,
                        )
                        m.last_run = datetime.now(timezone.utc)
                        db.add(m)
                        await db.commit()

                # Also refresh user instances
                res = await db.execute(select(ReviewInstance).where(ReviewInstance.active == True))
                instances = res.scalars().all()
                for inst in instances:
                    due = False
                    if inst.last_run is None:
                        due = True
                    else:
                        ir = inst.last_run
                        try:
                            delta = now - ir
                        except Exception:
                            ir = ir.replace(tzinfo=timezone.utc)
                            delta = now - ir
                        due = delta > timedelta(minutes=inst.interval_minutes)
                    if due:
                        locales = [loc for loc in (inst.locales or []) if loc in LOCALES]
                        await force_refresh_locales(
                            db,
                            inst.place_url,
                            locales or list(LOCALES.keys()),
                            1.0,
                            0,
                            inst.sort,
                        )
                        inst.last_run = datetime.now(timezone.utc)
                        db.add(inst)
                        await db.commit()
        except Exception:
            # continue loop on errors
            pass
        await asyncio.sleep(settings.MONITOR_POLL_SECONDS)


async def _retry_scrape_loop(place_url: str, locales: list[str], delay_seconds: int = 300):
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await force_refresh_locales(db, place_url, locales, 1.0, 0, "newest")
            print(f"[RETRY] Success scraping place={place_url} locales={locales}")
            return
        except Exception as e:
            # Keep retrying on any error after delay
            print(f"[RETRY] Failed scrape place={place_url} err={e}. Retrying in {delay_seconds}s")
        await asyncio.sleep(delay_seconds)


def schedule_rescrape(place_url: str, locales: list[str], delay_seconds: int = 300):
    try:
        asyncio.create_task(_retry_scrape_loop(place_url, locales, delay_seconds))
        print(f"[RETRY] Scheduled rescrape in {delay_seconds}s for place={place_url} locales={locales}")
    except Exception:
        pass

