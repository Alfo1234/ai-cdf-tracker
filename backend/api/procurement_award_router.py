from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.database.db import get_session
from backend.models.procurement_award import ProcurementAward


router = APIRouter(prefix="/procurement-awards", tags=["Procurement Awards"])


# ---------- Schemas (simple request bodies) ----------

from pydantic import BaseModel

class ProcurementAwardCreate(BaseModel):
    project_id: int
    contractor_id: int
    tender_id: Optional[str] = None
    procurement_method: Optional[str] = None
    contract_value: Optional[float] = None
    award_date: Optional[date] = None
    contractor_share_hint: Optional[float] = None
    performance_flag: bool = False
    performance_flag_reason: Optional[str] = None

class ProcurementAwardUpdate(BaseModel):
    contractor_id: Optional[int] = None
    tender_id: Optional[str] = None
    procurement_method: Optional[str] = None
    contract_value: Optional[float] = None
    award_date: Optional[date] = None
    contractor_share_hint: Optional[float] = None
    performance_flag: Optional[bool] = None
    performance_flag_reason: Optional[str] = None


# ---------- Routes ----------

@router.get("/", response_model=List[ProcurementAward])
def list_awards(session: Session = Depends(get_session)):
    return session.exec(select(ProcurementAward).order_by(ProcurementAward.id)).all()


@router.get("/{award_id}", response_model=ProcurementAward)
def get_award(award_id: int, session: Session = Depends(get_session)):
    award = session.get(ProcurementAward, award_id)
    if not award:
        raise HTTPException(status_code=404, detail="Award not found")
    return award


@router.post("/", response_model=ProcurementAward)
def create_award(payload: ProcurementAwardCreate, session: Session = Depends(get_session)):
    # One award per project (your model uses unique=True on project_id)
    existing = session.exec(
        select(ProcurementAward).where(ProcurementAward.project_id == payload.project_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This project already has an award")

    award = ProcurementAward(**payload.model_dump())
    session.add(award)
    session.commit()
    session.refresh(award)
    return award


@router.put("/{award_id}", response_model=ProcurementAward)
def update_award(award_id: int, payload: ProcurementAwardUpdate, session: Session = Depends(get_session)):
    award = session.get(ProcurementAward, award_id)
    if not award:
        raise HTTPException(status_code=404, detail="Award not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(award, k, v)

    session.add(award)
    session.commit()
    session.refresh(award)
    return award


@router.delete("/{award_id}")
def delete_award(award_id: int, session: Session = Depends(get_session)):
    award = session.get(ProcurementAward, award_id)
    if not award:
        raise HTTPException(status_code=404, detail="Award not found")

    session.delete(award)
    session.commit()
    return {"message": "Award deleted"}
