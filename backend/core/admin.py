# backend/core/admin.py
from fastapi import Depends, HTTPException, status

from backend.core.auth import get_current_user
from backend.models.user import User

def require_admin(user: User = Depends(get_current_user)) -> User:
    # if you add status later, you can also block disabled users here
    # if getattr(user, "status", "active") != "active":
    #     raise HTTPException(status_code=403, detail="Account disabled")

    if getattr(user, "role", "admin") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user
