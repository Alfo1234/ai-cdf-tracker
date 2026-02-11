from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from typing import List

from backend.database.db import get_session
from backend.models.feedback import Feedback
from backend.models.project import Project

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("/", status_code=201)
def submit_feedback(feedback: Feedback, request: Request, session: Session = Depends(get_session)):
    project = session.get(Project, feedback.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    feedback.ip_address = request.client.host if request.client else None

    session.add(feedback)
    session.commit()
    session.refresh(feedback)

    return {"message": "Thank you! Your observation has been submitted and will be reviewed."}


@router.get("/", response_model=List[Feedback])
def get_all_feedback(session: Session = Depends(get_session)):
    return session.exec(select(Feedback)).all()


@router.patch("/{feedback_id}/status")
def update_feedback_status(feedback_id: int, status_update: dict, session: Session = Depends(get_session)):
    feedback = session.get(Feedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    new_status = status_update.get("status")
    if new_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status. Use 'approved' or 'rejected'")

    feedback.status = new_status
    session.add(feedback)
    session.commit()

    return {"message": f"Feedback marked as {new_status}"}
