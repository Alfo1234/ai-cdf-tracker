# backend/api/contractor_router.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from backend.database.db import engine
from backend.models.contractor import Contractor


router = APIRouter(prefix="/contractors", tags=["Contractors"])


# -------------------------
# DB SESSION DEPENDENCY
# -------------------------
def get_session():
    with Session(engine) as session:
        yield session


# -------------------------
# SCHEMAS (lightweight)
# -------------------------
from pydantic import BaseModel


class ContractorCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    registration_no: Optional[str] = None
    address: Optional[str] = None


class ContractorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    registration_no: Optional[str] = None
    address: Optional[str] = None


# -------------------------
# CRUD
# -------------------------
@router.get("/", response_model=List[Contractor])
def list_contractors(session: Session = Depends(get_session)):
    contractors = session.exec(select(Contractor).order_by(Contractor.id)).all()
    return contractors


@router.get("/{contractor_id}", response_model=Contractor)
def get_contractor(contractor_id: int, session: Session = Depends(get_session)):
    contractor = session.get(Contractor, contractor_id)
    if not contractor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contractor not found",
        )
    return contractor


@router.post("/", response_model=Contractor, status_code=status.HTTP_201_CREATED)
def create_contractor(payload: ContractorCreate, session: Session = Depends(get_session)):
    contractor = Contractor(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        registration_no=payload.registration_no,
        address=payload.address,
    )
    session.add(contractor)
    session.commit()
    session.refresh(contractor)
    return contractor


@router.put("/{contractor_id}", response_model=Contractor)
def update_contractor(
    contractor_id: int,
    payload: ContractorUpdate,
    session: Session = Depends(get_session),
):
    contractor = session.get(Contractor, contractor_id)
    if not contractor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contractor not found",
        )

    data = payload.model_dump(exclude_unset=True)

    # Apply updates
    for key, value in data.items():
        setattr(contractor, key, value)

    session.add(contractor)
    session.commit()
    session.refresh(contractor)
    return contractor


@router.delete("/{contractor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contractor(contractor_id: int, session: Session = Depends(get_session)):
    contractor = session.get(Contractor, contractor_id)
    if not contractor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contractor not found",
        )

    session.delete(contractor)
    session.commit()
    return None
