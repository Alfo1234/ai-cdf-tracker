# backend/models/project.py
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from backend.models.procurement_award import ProcurementAward


class ProjectCategory(str, Enum):
    Education = "Education"
    Health = "Health"
    Water = "Water"
    Infrastructure = "Infrastructure"
    Security = "Security"
    Environment = "Environment"
    Other = "Other"


class ProjectStatus(str, Enum):
    Planned = "Planned"
    Ongoing = "Ongoing"
    Completed = "Completed"
    Flagged = "Flagged"


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    title: str = Field(index=True, max_length=255)
    description: Optional[str] = None

    category: ProjectCategory
    status: ProjectStatus = ProjectStatus.Planned

    budget: float
    spent: Optional[float] = None
    progress: Optional[float] = None  # 0-100

    constituency_code: str = Field(foreign_key="constituency.code")

    start_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None

    # ✅ Provenance (data origin)
    # True = seeded/mock/demo rows, False = imported/real rows
    is_mock: bool = Field(default=True, index=True)
    source_name: Optional[str] = Field(default=None, max_length=120, index=True)
    source_url: Optional[str] = Field(default=None, max_length=500)
    source_doc_ref: Optional[str] = Field(default=None, max_length=120)

    # One-to-one procurement award (optional)
    procurement_award: Optional["ProcurementAward"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"uselist": False},
    )

    # Audit / sorting
    last_updated: datetime = Field(default_factory=datetime.utcnow, nullable=False)
