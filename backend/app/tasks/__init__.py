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
                inst.min_rating,
                inst.max_reviews,
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
                            m.min_rating,
                            m.max_reviews,
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
                            inst.min_rating,
                            inst.max_reviews,
                            inst.sort,
                        )
                        inst.last_run = datetime.now(timezone.utc)
                        db.add(inst)
                        await db.commit()
        except Exception:
            # continue loop on errors
            pass
        await asyncio.sleep(settings.MONITOR_POLL_SECONDS)

