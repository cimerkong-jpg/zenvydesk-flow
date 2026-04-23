from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User


DEFAULT_SUPER_ADMIN_EMAIL = "admin@zenvydesk.com"
DEFAULT_SUPER_ADMIN_PASSWORD = "Admin123!"
DEFAULT_SUPER_ADMIN_NAME = "Super Admin"


def seed_admin(db: Session) -> User:
    existing = (
        db.query(User)
        .filter(User.email == DEFAULT_SUPER_ADMIN_EMAIL, User.deleted_at.is_(None))
        .first()
    )
    if existing:
        return existing

    admin = User(
        email=DEFAULT_SUPER_ADMIN_EMAIL,
        username=DEFAULT_SUPER_ADMIN_EMAIL,
        name=DEFAULT_SUPER_ADMIN_NAME,
        full_name=DEFAULT_SUPER_ADMIN_NAME,
        password_hash=hash_password(DEFAULT_SUPER_ADMIN_PASSWORD),
        role="super_admin",
        status="active",
        is_email_verified=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin
