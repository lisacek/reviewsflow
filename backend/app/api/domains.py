from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas import DomainCreate, DomainOut
from app.db import get_db
from app.models import Domain, User
from app.auth import get_current_user

router = APIRouter(prefix="/domains", tags=["domains"])


@router.get("", response_model=list[DomainOut])
async def list_domains(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Domain).where(Domain.user_id == user.id))
    rows = res.scalars().all()
    return [DomainOut(id=d.id, host=d.host, active=d.active) for d in rows]


@router.post("", response_model=DomainOut)
async def create_domain(req: DomainCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    d = Domain(user_id=user.id, host=req.host, active=True)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return DomainOut(id=d.id, host=d.host, active=d.active)


@router.delete("/{domain_id}")
async def delete_domain(domain_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Domain).where(Domain.id == domain_id, Domain.user_id == user.id))
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=404, detail="Domain not found")
    await db.delete(d)
    await db.commit()
    return {"success": True}

