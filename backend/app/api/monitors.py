from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas import MonitorCreate, Monitor as MonitorSchema
from app.db import get_db
from app.models import MonitoredPlace
from app.locales import LOCALES

router = APIRouter(prefix="/monitors", tags=["monitors"])


@router.post("", response_model=MonitorSchema)
async def create_monitor(req: MonitorCreate, db: AsyncSession = Depends(get_db)):
    locales = req.locales or list(LOCALES.keys())
    locales = [loc for loc in locales if loc in LOCALES]
    m = MonitoredPlace(
        place_url=str(req.place_url),
        locales=locales,
        interval_minutes=req.interval_minutes,
        min_rating=req.min_rating,
        max_reviews=req.max_reviews,
        sort=req.sort,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return MonitorSchema(
        id=m.id,
        place_url=m.place_url,
        locales=m.locales,
        interval_minutes=m.interval_minutes,
        min_rating=m.min_rating,
        max_reviews=m.max_reviews,
        sort=m.sort,
        last_run=m.last_run,
    )


@router.get("", response_model=list[MonitorSchema])
async def list_monitors(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(MonitoredPlace))
    rows = res.scalars().all()
    return [
        MonitorSchema(
            id=m.id,
            place_url=m.place_url,
            locales=m.locales,
            interval_minutes=m.interval_minutes,
            min_rating=m.min_rating,
            max_reviews=m.max_reviews,
            sort=m.sort,
            last_run=m.last_run,
        )
        for m in rows
    ]


@router.delete("/{monitor_id}")
async def delete_monitor(monitor_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(MonitoredPlace).where(MonitoredPlace.id == monitor_id))
    m = res.scalars().first()
    if not m:
        raise HTTPException(status_code=404, detail="Monitor not found")
    await db.delete(m)
    await db.commit()
    return {"success": True}

