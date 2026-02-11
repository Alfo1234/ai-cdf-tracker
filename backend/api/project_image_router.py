from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from typing import List, Optional
from datetime import timedelta

from backend.database.db import get_session
from backend.models.project_image import ProjectImage
from backend.models.project import Project
from backend.core.minio_client import ensure_bucket, upload_project_image, minio_client, BUCKET_NAME

from minio.error import S3Error

router = APIRouter(prefix="/projects", tags=["Project Images"])

ensure_bucket()


@router.post("/{project_id}/images", response_model=ProjectImage)
async def upload_image(
    project_id: int,
    caption: Optional[str] = Form(None),
    uploaded_by: str = Form("admin"),
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP allowed")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        object_name = upload_project_image(contents, file.filename or "unknown.jpg", project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    db_image = ProjectImage(
        project_id=project_id,
        filename=file.filename or "unknown.jpg",
        object_name=object_name,
        caption=caption,
        uploaded_by=uploaded_by,
    )
    session.add(db_image)
    session.commit()
    session.refresh(db_image)

    return db_image


@router.get("/{project_id}/images", response_model=List[ProjectImage])
def get_project_images(project_id: int, session: Session = Depends(get_session)):
    return session.exec(select(ProjectImage).where(ProjectImage.project_id == project_id)).all()


@router.get("/{project_id}/images/public", response_model=List[dict])
def get_project_images_public(project_id: int, session: Session = Depends(get_session)):
    images = session.exec(select(ProjectImage).where(ProjectImage.project_id == project_id)).all()

    public_images = []
    for image in images:
        try:
            url = minio_client.presigned_get_object(
                bucket_name=BUCKET_NAME,
                object_name=image.object_name,
                expires=timedelta(days=7),
            )
        except S3Error:
            url = None

        public_images.append({
            "id": image.id,
            "filename": image.filename,
            "caption": image.caption or "No caption",
            "uploaded_by": image.uploaded_by,
            "uploaded_at": image.uploaded_at.isoformat(),
            "url": url,
            "object_name": image.object_name,
        })

    return public_images


@router.get("/{project_id}/images/{image_id}/view")
async def view_image(project_id: int, image_id: int, session: Session = Depends(get_session)):
    image = session.get(ProjectImage, image_id)
    if not image or image.project_id != project_id:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        presigned_url = minio_client.presigned_get_object(
            bucket_name=BUCKET_NAME,
            object_name=image.object_name,
            expires=timedelta(hours=1),
        )
        return RedirectResponse(url=presigned_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate view URL: {str(e)}")
