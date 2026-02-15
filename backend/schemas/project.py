# backend/schemas/project.py
from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel


class ProjectReadWithConstituency(SQLModel):
    id: int
    title: str
    description: Optional[str]

    category: str
    status: str

    budget: float
    spent: Optional[float] = None
    progress: Optional[float] = None

    constituency_code: str
    constituency_name: str
    mp_name: str
    county: str

    contractor_name: Optional[str] = None
    tender_id: Optional[str] = None
    procurement_method: Optional[str] = None
    contract_value: Optional[float] = None
    award_date: Optional[date] = None

    start_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    last_updated: Optional[datetime] = None

    # ✅ Provenance fields (API now returns them)
    is_mock: bool
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_doc_ref: Optional[str] = None
