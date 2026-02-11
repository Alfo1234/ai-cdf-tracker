# backend/api/project_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, desc, asc
from typing import List, Optional
from datetime import datetime
from sqlalchemy import func

from backend.database.db import get_session
from backend.models.project import Project, ProjectCategory, ProjectStatus
from backend.models.constituency import Constituency
from backend.models.procurement_award import ProcurementAward
from backend.models.contractor import Contractor
from backend.schemas.project import ProjectReadWithConstituency

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(project: Project, session: Session = Depends(get_session)):
    constituency = session.get(Constituency, project.constituency_code)
    if not constituency:
        raise HTTPException(status_code=404, detail="Constituency not found")

    project.last_updated = datetime.utcnow()
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.get("/", response_model=List[ProjectReadWithConstituency])
def read_projects(
    session: Session = Depends(get_session),
    constituency_code: Optional[str] = Query(None),
    category: Optional[ProjectCategory] = Query(None),
    status: Optional[ProjectStatus] = Query(None),
    sort: Optional[str] = Query(
        "last_updated_desc",
        description="id_asc, id_desc, last_updated_asc, last_updated_desc, title_asc, title_desc"
    ),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    query = (
        select(Project, Constituency, ProcurementAward, Contractor)
        .join(Constituency, Project.constituency_code == Constituency.code)
        .outerjoin(ProcurementAward, ProcurementAward.project_id == Project.id)
        .outerjoin(Contractor, Contractor.id == ProcurementAward.contractor_id)
    )

    if constituency_code:
        query = query.where(Project.constituency_code == constituency_code)
    if category:
        query = query.where(Project.category == category)
    if status:
        query = query.where(Project.status == status)

    sort_field = Project.last_updated
    sort_direction = desc

    if sort == "id_asc":
        sort_field = Project.id
        sort_direction = asc
    elif sort == "id_desc":
        sort_field = Project.id
        sort_direction = desc
    elif sort == "title_asc":
        sort_field = Project.title
        sort_direction = asc
    elif sort == "title_desc":
        sort_field = Project.title
        sort_direction = desc
    elif sort == "last_updated_asc":
        sort_field = Project.last_updated
        sort_direction = asc

    query = query.order_by(sort_direction(sort_field))

    _total_count = session.exec(select(func.count(Project.id))).one()
    results = session.exec(query.offset(offset).limit(limit)).all()

    projects: List[ProjectReadWithConstituency] = []
    for project, constituency, award, contractor in results:
        d = project.dict()
        d["constituency_name"] = constituency.name
        d["county"] = constituency.county
        d["mp_name"] = constituency.mp_name

        d["contractor_name"] = contractor.name if contractor else None
        d["tender_id"] = award.tender_id if award else None
        d["procurement_method"] = award.procurement_method if award else None
        d["contract_value"] = award.contract_value if award else None
        d["award_date"] = award.award_date if award else None

        projects.append(ProjectReadWithConstituency.model_validate(d))

    return projects


@router.get("/{project_id}", response_model=ProjectReadWithConstituency)
def read_project(project_id: int, session: Session = Depends(get_session)):
    result = session.exec(
        select(Project, Constituency, ProcurementAward, Contractor)
        .join(Constituency, Project.constituency_code == Constituency.code)
        .outerjoin(ProcurementAward, ProcurementAward.project_id == Project.id)
        .outerjoin(Contractor, Contractor.id == ProcurementAward.contractor_id)
        .where(Project.id == project_id)
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Project not found")

    project, constituency, award, contractor = result

    d = project.dict()
    d["constituency_name"] = constituency.name
    d["county"] = constituency.county
    d["mp_name"] = constituency.mp_name

    d["contractor_name"] = contractor.name if contractor else None
    d["tender_id"] = award.tender_id if award else None
    d["procurement_method"] = award.procurement_method if award else None
    d["contract_value"] = award.contract_value if award else None
    d["award_date"] = award.award_date if award else None

    return ProjectReadWithConstituency.model_validate(d)


@router.put("/{project_id}", response_model=Project)
def update_project(project_id: int, updated_project: Project, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if updated_project.constituency_code != project.constituency_code:
        constituency = session.get(Constituency, updated_project.constituency_code)
        if not constituency:
            raise HTTPException(status_code=404, detail="Constituency not found")

    data = updated_project.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(project, k, v)

    project.last_updated = datetime.utcnow()

    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    session.delete(project)
    session.commit()
    return None
