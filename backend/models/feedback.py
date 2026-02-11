# backend/models/feedback.py
from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[str] = Field(default=None, max_length=255)
    message: str = Field(max_length=2000)
    ip_address: Optional[str] = Field(default=None, max_length=45)  # For abuse tracking
    status: str = Field(default="pending", max_length=20)  # pending, approved, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        schema_extra = {
            "example": {
                "project_id": 7,
                "name": "John Doe",
                "email": "john@example.com",
                "message": "The borehole was completed but the water pump is not working.",
            }
        }