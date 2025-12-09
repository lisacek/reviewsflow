import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas import InstanceCreate, InstanceUpdate, InstanceOut
from app.db import get_db
from app.models import ReviewInstance, User
from app.auth import get_current_user
from app.locales import LOCALES
from app.config import settings

router = APIRouter(prefix="/instances", tags=["instances"])


@router.get("", response_model=list[InstanceOut])
async def list_instances(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ReviewInstance).where(ReviewInstance.user_id == user.id))
    rows = res.scalars().all()
    out: list[InstanceOut] = []
    for i in rows:
        out.append(InstanceOut(
            id=i.id,
            public_key=i.public_key,
            place_url=i.place_url,
            locales=i.locales or [],
            interval_minutes=i.interval_minutes,
            min_rating=i.min_rating,
            max_reviews=i.max_reviews,
            sort=i.sort,
            active=i.active,
            domain_id=i.domain_id,
        ))
    return out


@router.post("", response_model=InstanceOut)
async def create_instance(req: InstanceCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    import uuid

    pk = uuid.uuid4().hex
    locales = req.locales or settings.DEFAULT_LOCALES or ["en-US"]
    inst = ReviewInstance(
        user_id=user.id,
        domain_id=req.domain_id,
        public_key=pk,
        place_url=str(req.place_url),
        locales=[loc for loc in locales if loc in LOCALES],
        interval_minutes=req.interval_minutes,
        min_rating=req.min_rating,
        max_reviews=req.max_reviews,
        sort=req.sort,
        active=True,
    )
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    # Warm cache asynchronously so public endpoint is ready
    try:
        from app.tasks import warm_instance
        asyncio.create_task(warm_instance(inst.id))
    except Exception:
        pass
    return InstanceOut(
        id=inst.id,
        public_key=inst.public_key,
        place_url=inst.place_url,
        locales=inst.locales or [],
        interval_minutes=inst.interval_minutes,
        min_rating=inst.min_rating,
        max_reviews=inst.max_reviews,
        sort=inst.sort,
        active=inst.active,
        domain_id=inst.domain_id,
    )


@router.patch("/{instance_id}", response_model=InstanceOut)
async def update_instance(instance_id: int, req: InstanceUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ReviewInstance).where(ReviewInstance.id == instance_id, ReviewInstance.user_id == user.id))
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    if req.locales is not None:
        inst.locales = [loc for loc in (req.locales or []) if loc in LOCALES]
    if req.interval_minutes is not None:
        inst.interval_minutes = req.interval_minutes
    if req.min_rating is not None:
        inst.min_rating = req.min_rating
    if req.max_reviews is not None:
        inst.max_reviews = req.max_reviews
    if req.sort is not None:
        inst.sort = req.sort
    if req.domain_id is not None:
        inst.domain_id = req.domain_id
    if req.active is not None:
        inst.active = req.active
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    # Warm cache after changes to reflect new settings
    try:
        from app.tasks import warm_instance
        asyncio.create_task(warm_instance(inst.id))
    except Exception:
        pass
    return InstanceOut(
        id=inst.id,
        public_key=inst.public_key,
        place_url=inst.place_url,
        locales=inst.locales or [],
        interval_minutes=inst.interval_minutes,
        min_rating=inst.min_rating,
        max_reviews=inst.max_reviews,
        sort=inst.sort,
        active=inst.active,
        domain_id=inst.domain_id,
    )


@router.delete("/{instance_id}")
async def delete_instance(instance_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ReviewInstance).where(ReviewInstance.id == instance_id, ReviewInstance.user_id == user.id))
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    await db.delete(inst)
    await db.commit()
    return {"success": True}

