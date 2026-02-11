from minio import Minio
from minio.error import S3Error
from backend.core.config import settings
import uuid
from datetime import timedelta
from io import BytesIO  

# Create the client once when app starts
minio_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,        # e.g., "minio:9000" or "localhost:9000"
    access_key=settings.MINIO_ACCESS_KEY,    # default: "minioadmin"
    secret_key=settings.MINIO_SECRET_KEY,    # default: "minioadmin"
    secure=False  # True if using HTTPS
)

BUCKET_NAME = "cdf-projects"

# Ensure bucket exists
def ensure_bucket():
    if not minio_client.bucket_exists(BUCKET_NAME):
        minio_client.make_bucket(BUCKET_NAME)


def upload_project_image(file_data: bytes, filename: str, project_id: int) -> str:
    # Create unique object name
    ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{ext}"
    object_name = f"projects/{project_id}/{unique_filename}"

    try:
        # Wrap bytes in BytesIO so MinIO SDK can read it
        data_stream = BytesIO(file_data)

        minio_client.put_object(
            bucket_name=BUCKET_NAME,
            object_name=object_name,
            data=data_stream,
            length=len(file_data),
            content_type=f"image/{ext}"
        )
        return object_name
    except S3Error as err:
        raise Exception(f"MinIO upload failed: {err}")