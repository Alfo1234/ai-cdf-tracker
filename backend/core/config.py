# backend/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()  # Loads .env file into environment


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered CDF Tracker"
    API_VERSION: str = "/api/v1"

    # Database
    DATABASE_URL: str

    # MinIO Settings
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_SECURE: bool = False  # False for local HTTP

    # ✅ Auth / JWT
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",  # ✅ so future env vars won't crash the app
    )


settings = Settings()
