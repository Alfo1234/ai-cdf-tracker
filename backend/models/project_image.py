from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class ProjectImage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    filename: str = Field(max_length=255)
    object_name: str = Field(max_length=500)  # Unique key in MinIO bucket
    caption: Optional[str] = Field(default=None, max_length=500)
    uploaded_by: str = Field(default="admin", max_length=50)  # "admin" or "citizen"
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)