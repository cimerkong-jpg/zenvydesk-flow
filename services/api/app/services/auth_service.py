from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: Optional[str]) -> bool:
    if not password_hash:
        return False
    return hash_password(password) == password_hash


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.session_token = token
    user.session_expires_at = datetime.utcnow() + timedelta(
        minutes=settings.session_expiry_minutes
    )
    db.commit()
    db.refresh(user)
    return token


def clear_session(db: Session, user: User) -> None:
    user.session_token = None
    user.session_expires_at = None
    db.commit()


def get_user_by_session(db: Session, token: str) -> Optional[User]:
    if not token:
        return None

    user = db.query(User).filter(User.session_token == token).first()
    if not user:
        return None

    if user.session_expires_at and user.session_expires_at < datetime.utcnow():
        user.session_token = None
        user.session_expires_at = None
        db.commit()
        return None

    return user
