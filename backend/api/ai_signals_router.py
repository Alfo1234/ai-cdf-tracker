from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from backend.database.db import get_session
from backend.ml_engine.scoring.project_signals import compute_project_signals

router = APIRouter(prefix="/ai", tags=["AI Signals"])


@router.get("/projects/{project_id}/signals")
def get_project_ai_signals(project_id: int, session: Session = Depends(get_session)):
    try:
        return compute_project_signals(session=session, project_id=project_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")