# backend/routers/users_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.database.db import get_session
from backend.models.user import User, UserRole, UserStatus
from backend.core.auth import require_admin

router = APIRouter(prefix="/users", tags=["Users"])


# -------------------------
# LIST USERS
# -------------------------
@router.get("/")
def list_users(
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
):
    users = session.exec(select(User).order_by(User.id.desc())).all()

    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "status": u.status,
            "created_at": u.created_at,
            "last_login": u.last_login,
        }
        for u in users
    ]


# -------------------------
# CREATE USER
# -------------------------
@router.post("/")
def create_user(
    payload: dict,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
):
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()
    role = payload.get("role", "moderator")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    existing = session.exec(select(User).where(User.username == username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=username,
        role=UserRole(role),
        status=UserStatus.active,
        full_name=payload.get("full_name"),
        email=payload.get("email"),
    )

    user.set_password(password)

    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }


# -------------------------
# CHANGE ROLE
# -------------------------
@router.patch("/{user_id}/role")
def update_role(
    user_id: int,
    payload: dict,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_role = payload.get("role")
    if new_role not in ["admin", "moderator", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user.role = UserRole(new_role)
    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }


# -------------------------
# CHANGE STATUS
# -------------------------
@router.patch("/{user_id}/status")
def update_status(
    user_id: int,
    payload: dict,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_status = payload.get("status")
    if new_status not in ["active", "disabled"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    user.status = UserStatus(new_status)
    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }


# -------------------------
# RESET PASSWORD
# -------------------------
@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    payload: dict,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
):
    new_password = (payload.get("password") or "").strip()

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.set_password(new_password)
    session.add(user)
    session.commit()

    return {"ok": True}


# -------------------------
# DELETE USER
# -------------------------
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    admin_user: User = Depends(require_admin),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    session.delete(user)
    session.commit()

    return {"ok": True}
