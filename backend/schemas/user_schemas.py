# backend/schemas/user_schemas.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from backend.models.user import UserRole, UserStatus


class UserRead(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: UserRole
    status: UserStatus
    created_at: datetime
    last_login: Optional[datetime] = None


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: UserRole = UserRole.moderator


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    status: UserStatus


class UserPasswordReset(BaseModel):
    password: str
