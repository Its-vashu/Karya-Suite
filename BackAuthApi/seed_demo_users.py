"""
Seed demo users for reviewer / recruiter access to the Karya Intranet Portal.

Usage (from BackAuthApi/ directory, with venv activated):
    python seed_demo_users.py

Creates (or updates in-place if they already exist):
    - admin@demo.com  / Admin@123     -> role: hr
    - employee@demo.com / Employee@123 -> role: employee

Notes:
  * `username` is set to the email so the one-click login on the frontend
    matches the displayed credentials.
  * Passwords are hashed with bcrypt via passlib (same as the app's
    `pwd_context`), so normal login flow works unchanged.
  * Script is idempotent: running it multiple times will not create
    duplicates and will reset the passwords to the known demo values.
"""

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from db.database import SessionLocal
from model.usermodels import User
from model.userDetails_model import UserDetails

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {
        "username": "admin@demo.com",
        "email": "admin@demo.com",
        "password": "Admin@123",
        "role": "hr",
        "full_name": "Demo HR Admin",
    },
    {
        "username": "employee@demo.com",
        "email": "employee@demo.com",
        "password": "Employee@123",
        "role": "employee",
        "full_name": "Demo Employee",
    },
]


def upsert_demo_user(db: Session, data: dict) -> None:
    hashed = pwd_context.hash(data["password"])
    user = (
        db.query(User)
        .filter((User.username == data["username"]) | (User.email == data["email"]))
        .first()
    )

    if user:
        user.username = data["username"]
        user.email = data["email"]
        user.password = hashed
        user.role = data["role"]
        user.is_verified = 1
        action = "updated"
    else:
        user = User(
            username=data["username"],
            email=data["email"],
            password=hashed,
            role=data["role"],
            is_verified=1,
        )
        db.add(user)
        db.flush()  # so user.id is available
        action = "created"

    details = db.query(UserDetails).filter(UserDetails.user_id == user.id).first()
    if not details:
        details = UserDetails(
            user_id=user.id,
            full_name=data["full_name"],
            personal_email=data["email"],
        )
        db.add(details)
    else:
        if not details.full_name:
            details.full_name = data["full_name"]

    print(f"  [{action}] {data['role']:<9} {data['username']}")


def main() -> None:
    db = SessionLocal()
    try:
        print("Seeding demo users...")
        for data in DEMO_USERS:
            upsert_demo_user(db, data)
        db.commit()
        print("Done. Demo users are ready.")
    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
