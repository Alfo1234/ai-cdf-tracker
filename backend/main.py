# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.api.router import router
from backend.core.config import settings
from backend.database.db import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up... Creating database tables if they don't exist")
    create_db_and_tables()
    yield
    print("Shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Transparent & AI-powered tracking of Kenya's CDF funds",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.API_VERSION)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to CDF Tracker API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
