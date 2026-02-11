# backend/scripts/seed_data.py
import sys
from pathlib import Path
from datetime import datetime, date
from typing import Optional

# Add the backend folder to Python path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from sqlmodel import Session, select
from sqlalchemy import delete  # ✅ FIX: use SQLAlchemy delete() with session.exec()

from backend.database.db import engine

from backend.models.constituency import Constituency
from backend.models.project import Project, ProjectCategory, ProjectStatus
from backend.models.contractor import Contractor
from backend.models.procurement_award import ProcurementAward


# Mock constituencies (6 total)
constituencies = [
    {"code": "001", "name": "Kajiado North", "county": "Kajiado", "mp_name": "Onesmus Ngogoyo Nguro"},
    {"code": "002", "name": "Kajiado Central", "county": "Kajiado", "mp_name": "Elijah Memusi Kanchory"},
    {"code": "003", "name": "Yatta", "county": "Machakos", "mp_name": "Robert Basil Ngui"},
    {"code": "004", "name": "Kisumu East", "county": "Kisumu", "mp_name": "Shakeel Shabbir Ahmed"},
    {"code": "005", "name": "Mwingi Central", "county": "Kitui", "mp_name": "Gideon Mulyungi"},
    {"code": "006", "name": "Kajiado East", "county": "Kajiado", "mp_name": "Kakai Leshore"},
]

projects_data = [
    # Kajiado North (3)
    {"title": "Kajiado North Classroom Block", "description": "Construction of 6 new classrooms at Ololu Primary School", "category": "Education", "status": "Completed", "budget": 3800000, "spent": 3800000, "progress": 100, "constituency_code": "001", "start_date": "2024-01-15", "completion_date": "2025-06-30"},
    {"title": "Isinya Water Pan Desilting", "description": "Desilting and fencing of community water pan", "category": "Water", "status": "Ongoing", "budget": 2800000, "spent": 1500000, "progress": 60, "constituency_code": "001", "start_date": "2025-03-01", "completion_date": "2025-12-31"},
    {"title": "Kitengela Dispensary Upgrade", "description": "Upgrade of Kitengela dispensary to level 4 facility", "category": "Health", "status": "Ongoing", "budget": 5200000, "spent": 2000000, "progress": 40, "constituency_code": "001", "start_date": "2025-02-01", "completion_date": "2026-03-01"},

    # Kajiado Central (2)
    {"title": "Kajiado Central Borehole Project", "description": "Drilling and equipping of solar-powered borehole", "category": "Water", "status": "Flagged", "budget": 2200000, "spent": 2200000, "progress": 100, "constituency_code": "002", "start_date": "2024-05-01", "completion_date": "2025-08-15"},
    {"title": "Kajiado Central Police Post Construction", "description": "Construction of modern police post", "category": "Security", "status": "Ongoing", "budget": 4800000, "spent": 1200000, "progress": 25, "constituency_code": "002", "start_date": "2025-01-10", "completion_date": "2025-12-20"},

    # Yatta (3)
    {"title": "Yatta Health Centre Upgrade", "description": "Expansion and equipping of maternity wing", "category": "Health", "status": "Ongoing", "budget": 4500000, "spent": 3000000, "progress": 70, "constituency_code": "003", "start_date": "2024-11-01", "completion_date": "2025-09-30"},
    {"title": "Kithimani Health Centre Expansion", "description": "Construction of new outpatient block", "category": "Health", "status": "Ongoing", "budget": 4100000, "spent": 1000000, "progress": 25, "constituency_code": "003", "start_date": "2025-04-01", "completion_date": "2026-02-28"},
    {"title": "Nyang'oma Secondary School Laboratory", "description": "Construction of modern science laboratory", "category": "Education", "status": "Planned", "budget": 3500000, "spent": 0, "progress": 0, "constituency_code": "003", "start_date": None, "completion_date": None},

    # Kisumu East (2)
    {"title": "Kisumu East Road Grading", "description": "Grading and murraming of 15km feeder roads", "category": "Infrastructure", "status": "Planned", "budget": 3200000, "spent": 0, "progress": 0, "constituency_code": "004", "start_date": None, "completion_date": None},
    {"title": "Kisumu East Solar Lighting", "description": "Installation of solar street lights in markets", "category": "Environment", "status": "Ongoing", "budget": 2800000, "spent": 800000, "progress": 30, "constituency_code": "004", "start_date": "2025-06-01", "completion_date": "2025-12-31"},

    # Mwingi Central (2)
    {"title": "Mwingi Central Solar Lighting", "description": "Solar lighting for public facilities", "category": "Environment", "status": "Planned", "budget": 1800000, "spent": 0, "progress": 0, "constituency_code": "005", "start_date": None, "completion_date": None},
    {"title": "Nguni Borehole Rehabilitation", "description": "Rehabilitation of community borehole", "category": "Water", "status": "Flagged", "budget": 1900000, "spent": 1900000, "progress": 100, "constituency_code": "005", "start_date": "2024-07-01", "completion_date": "2025-05-15"},
]


def _to_dt(v: Optional[str]) -> Optional[datetime]:
    """
    Convert "YYYY-MM-DD" string into datetime, or return None.
    """
    if not v:
        return None
    return datetime.strptime(v, "%Y-%m-%d")


def seed_data():
    with Session(engine) as session:
        # 1) Clear existing data (order matters because of FK constraints)
        # ✅ FIX: Replace session.query(...).delete() with session.exec(delete(...))
        session.exec(delete(ProcurementAward))
        session.exec(delete(Contractor))
        session.exec(delete(Project))
        session.exec(delete(Constituency))
        session.commit()

        # 2) Add constituencies
        session.add_all([Constituency(**c) for c in constituencies])
        session.commit()

        # 3) Add projects
        created_projects = []
        for p in projects_data:
            project = Project(
                title=p["title"],
                description=p["description"],
                category=ProjectCategory(p["category"]),
                status=ProjectStatus(p["status"]),
                budget=p["budget"],
                spent=p["spent"],
                progress=p["progress"],
                constituency_code=p["constituency_code"],
                start_date=_to_dt(p["start_date"]),
                completion_date=_to_dt(p["completion_date"]),
            )
            session.add(project)
            created_projects.append(project)

        session.commit()

        # Refresh so IDs are available
        for pr in created_projects:
            session.refresh(pr)

        # 4) Create contractors
        contractors = [
            Contractor(name="AquaDrill Services Ltd", registration_no="C-10291", kra_pin="P051234567A"),
            Contractor(name="Mavuno Builders Ltd", registration_no="C-20911", kra_pin="P051112233B"),
            Contractor(name="Nuru Engineering Co.", registration_no="C-30018", kra_pin="P059999888C"),
            Contractor(name="Kibo Works & Supplies", registration_no="C-40877", kra_pin="P055551010D"),
        ]
        session.add_all(contractors)
        session.commit()

        # Refresh so IDs are available
        for c in contractors:
            session.refresh(c)

        # Helper lookup
        def get_project_by_title(title: str) -> Project:
            return session.exec(select(Project).where(Project.title == title)).one()

        # 5) Add procurement awards
        awards = [
            # AquaDrill repeats in Water projects (creates future “same contractor dominance” signal)
            ProcurementAward(
                project_id=get_project_by_title("Nguni Borehole Rehabilitation").id,
                contractor_id=contractors[0].id,
                tender_id="NG-CDF/MWINGI/2025/019",
                procurement_method="Open Tender",
                contract_value=1900000,
                award_date=date(2024, 6, 10),
                performance_flag=True,
                performance_flag_reason="Prior borehole project reported incomplete despite full payment (seeded demo signal).",
            ),
            ProcurementAward(
                project_id=get_project_by_title("Kajiado Central Borehole Project").id,
                contractor_id=contractors[0].id,
                tender_id="NG-CDF/KAJIADO/2024/041",
                procurement_method="Open Tender",
                contract_value=2200000,
                award_date=date(2024, 4, 2),
            ),
            ProcurementAward(
                project_id=get_project_by_title("Isinya Water Pan Desilting").id,
                contractor_id=contractors[0].id,
                tender_id="NG-CDF/KAJIADO/2025/008",
                procurement_method="RFQ",
                contract_value=2800000,
                award_date=date(2025, 2, 20),
            ),

            # Mavuno repeats in construction/health
            ProcurementAward(
                project_id=get_project_by_title("Kajiado North Classroom Block").id,
                contractor_id=contractors[1].id,
                tender_id="NG-CDF/KAJIADO/2024/002",
                procurement_method="Open Tender",
                contract_value=3800000,
                award_date=date(2024, 1, 5),
            ),
            ProcurementAward(
                project_id=get_project_by_title("Kithimani Health Centre Expansion").id,
                contractor_id=contractors[1].id,
                tender_id="NG-CDF/YATTA/2025/015",
                procurement_method="Open Tender",
                contract_value=4100000,
                award_date=date(2025, 3, 15),
            ),

            # Nuru in environment
            ProcurementAward(
                project_id=get_project_by_title("Kisumu East Solar Lighting").id,
                contractor_id=contractors[2].id,
                tender_id="NG-CDF/KISUMU/2025/003",
                procurement_method="Open Tender",
                contract_value=2800000,
                award_date=date(2025, 5, 20),
            ),
            ProcurementAward(
                project_id=get_project_by_title("Mwingi Central Solar Lighting").id,
                contractor_id=contractors[2].id,
                tender_id="NG-CDF/MWINGI/2025/022",
                procurement_method="Direct Procurement",
                contract_value=1800000,
                award_date=date(2025, 6, 1),
                performance_flag=True,
                performance_flag_reason="Direct procurement used repeatedly by same contractor in same FY (seeded demo signal).",
            ),

            # Kibo
            ProcurementAward(
                project_id=get_project_by_title("Kajiado Central Police Post Construction").id,
                contractor_id=contractors[3].id,
                tender_id="NG-CDF/KAJIADO/2025/013",
                procurement_method="Open Tender",
                contract_value=4800000,
                award_date=date(2025, 1, 2),
            ),
        ]

        session.add_all(awards)
        session.commit()

        print("Seeded successfully: constituencies, projects, contractors, procurement awards.")


if __name__ == "__main__":
    seed_data()
