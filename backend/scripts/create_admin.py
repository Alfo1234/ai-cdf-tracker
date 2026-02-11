# backend/scripts/create_admin.py

from sqlmodel import Session, select

from backend.database.db import engine
from backend.models.user import User, UserRole


def create_admin():
    with Session(engine) as session:
        existing_admin = session.exec(
            select(User).where(User.username == "admin")
        ).first()

        if existing_admin:
            print("Admin already exists.")
            return

        admin = User(
            username="admin",
            role=UserRole.admin,
            full_name="System Administrator",
            email="admin@cdftracker.local",
        )

        admin.set_password("cdf2025")  # change after first login

        session.add(admin)
        session.commit()
        session.refresh(admin)

        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: cdf2025")


if __name__ == "__main__":
    create_admin()
