from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional

from backend.database.db import get_session
from backend.models.constituency import Constituency

router = APIRouter(prefix="/constituencies", tags=["Constituencies"])


@router.post("/", response_model=Constituency, status_code=status.HTTP_201_CREATED)
def create_constituency(constituency: Constituency, session: Session = Depends(get_session)):
    session.add(constituency)
    session.commit()
    session.refresh(constituency)
    return constituency


@router.get("/", response_model=List[Constituency])
def read_constituencies(session: Session = Depends(get_session), offset: int = 0, limit: int = 100):
    return session.exec(select(Constituency).offset(offset).limit(limit)).all()


@router.get("/{code}", response_model=Constituency)
def read_constituency(code: str, session: Session = Depends(get_session)):
    constituency = session.get(Constituency, code)
    if not constituency:
        raise HTTPException(status_code=404, detail="Constituency not found")
    return constituency


@router.put("/{code}", response_model=Constituency)
def update_constituency(code: str, updated: Constituency, session: Session = Depends(get_session)):
    constituency = session.get(Constituency, code)
    if not constituency:
        raise HTTPException(status_code=404, detail="Constituency not found")

    data = updated.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(constituency, k, v)

    session.add(constituency)
    session.commit()
    session.refresh(constituency)
    return constituency


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_constituency(code: str, session: Session = Depends(get_session)):
    constituency = session.get(Constituency, code)
    if not constituency:
        raise HTTPException(status_code=404, detail="Constituency not found")

    session.delete(constituency)
    session.commit()
    return None


@router.get("/search/", response_model=List[Constituency])
def search_constituencies(
    name: Optional[str] = None,
    county: Optional[str] = None,
    session: Session = Depends(get_session)
):
    q = select(Constituency)
    if name:
        q = q.where(Constituency.name.ilike(f"%{name}%"))
    if county:
        q = q.where(Constituency.county.ilike(f"%{county}%"))
    return session.exec(q).all()
