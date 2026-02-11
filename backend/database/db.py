# backend/database/db.py
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session  # type: ignore
from backend.core.config import settings

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
)

def create_db_and_tables():
    """
    Import all table models exactly once using ONE consistent module path: backend.models.*
    """
    from backend.models.constituency import Constituency  # noqa: F401
    from backend.models.project import Project            # noqa: F401
    from backend.models.feedback import Feedback          # noqa: F401
    from backend.models.user import User                  # noqa: F401
    from backend.models.project_image import ProjectImage # noqa: F401

    # New tables
    from backend.models.contractor import Contractor              # noqa: F401
    from backend.models.procurement_award import ProcurementAward # noqa: F401

    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
