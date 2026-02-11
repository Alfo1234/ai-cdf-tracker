# backend/models/procurement_award.py
from typing import Optional, TYPE_CHECKING
from datetime import datetime, date

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from backend.models.project import Project
    from backend.models.contractor import Contractor


class ProcurementAward(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

   
    project_id: int = Field(foreign_key="project.id", index=True)
    contractor_id: int = Field(foreign_key="contractor.id", index=True)

    tender_id: Optional[str] = Field(default=None, index=True, max_length=120)
    procurement_method: Optional[str] = Field(default=None, max_length=80)

    contract_value: Optional[float] = None
    award_date: Optional[date] = None

    contractor_share_hint: Optional[float] = None
    performance_flag: Optional[bool] = Field(default=False)
    performance_flag_reason: Optional[str] = Field(default=None, max_length=500)

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    project: Optional["Project"] = Relationship(back_populates="procurement_award")
    contractor: Optional["Contractor"] = Relationship(back_populates="awards")
