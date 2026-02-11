# backend/models/user.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from argon2 import PasswordHasher
from sqlmodel import SQLModel, Field


_ph = PasswordHasher()


class UserRole(str, Enum):
    admin = "admin"
    moderator = "moderator"
    viewer = "viewer"


class UserStatus(str, Enum):
    active = "active"
    disabled = "disabled"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # auth identity
    username: str = Field(index=True, unique=True)

    # password storage (argon2 hash)
    password_hash: str

    # profile (admin UI)
    full_name: Optional[str] = None
    email: Optional[str] = Field(default=None, index=True)

    # access control (admin UI)
    role: UserRole = Field(default=UserRole.moderator)
    status: UserStatus = Field(default=UserStatus.active)

    # audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    # -----------------------
    # Password helpers
    # -----------------------
    def set_password(self, password: str) -> None:
        """Hash and store a password."""
        self.password_hash = _ph.hash(password)

    def verify_password(self, password: str) -> bool:
        """Verify a raw password against the stored hash."""
        try:
            return _ph.verify(self.password_hash, password)
        except Exception:
            return False
