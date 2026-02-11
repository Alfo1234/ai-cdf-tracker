# backend/models/constituency.py
from typing import Optional
from sqlmodel import SQLModel, Field

class Constituency(SQLModel, table=True):
    code: str = Field(primary_key=True, index=True, description="Official constituency code, e.g., '184'")
    name: str = Field(index=True, description="Full name of the constituency, e.g., 'Kajiado Central'")
    county: str = Field(index=True, description="County the constituency belongs to")
    mp_name: str = Field(description="Current Member of Parliament — required for accountability")
    population: Optional[int] = Field(default=None, description="Approximate population")
    pas_score: Optional[float] = Field(default=None, description="Public Accountability Score (0-100)")