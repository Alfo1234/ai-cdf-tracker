# backend/api/router.py
from fastapi import APIRouter
from .constituency_router import router as constituency_router   
from .project_router import router as project_router  
from .feedback_router import router as feedback_router  
from .auth_router import router as auth_router
from .project_image_router import router as project_image_router
from .procurement_award_router import router as procurement_award_router
from .contractor_router import router as contractor_router
from .users_router import router as users_router





router = APIRouter()

# Health check (already there or add it)
@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "cdf-tracker-api"}

# Include routes
router.include_router(constituency_router)
router.include_router(project_router)
router.include_router(feedback_router)
router.include_router(auth_router)
router.include_router(project_image_router)
router.include_router(procurement_award_router)
router.include_router(contractor_router)
router.include_router(users_router)
