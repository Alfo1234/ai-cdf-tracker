# backend/models/contractor.py
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from backend.models.procurement_award import ProcurementAward


class Contractor(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    name: str = Field(index=True, max_length=160)

    # optional metadata
    phone: Optional[str] = Field(default=None, max_length=40)
    email: Optional[str] = Field(default=None, max_length=160)
    registration_no: Optional[str] = Field(default=None, max_length=120)
    address: Optional[str] = Field(default=None, max_length=240)

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # ✅ This is what your ProcurementAward expects:
    awards: List["ProcurementAward"] = Relationship(back_populates="contractor")
