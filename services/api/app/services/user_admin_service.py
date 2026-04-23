from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.services.permission_service import ROLE_ORDER, can_manage_role


def _utcnow() -> datetime:
    return datetime.now()


class UserAdminService:
    def __init__(self, db: Session):
        self.db = db

    def list_users(
        self,
        keyword: str | None,
        role: str | None,
        status_value: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[User], int]:
        query = self.db.query(User).filter(User.deleted_at.is_(None))
        if keyword:
            term = f"%{keyword.strip()}%"
            query = query.filter(or_(User.email.ilike(term), User.full_name.ilike(term), User.name.ilike(term)))
        if role:
            query = query.filter(User.role == role)
        if status_value:
            query = query.filter(User.status == status_value)

        total = query.count()
        items = (
            query.order_by(User.created_at.desc(), User.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def create_user(self, actor: User, email: str, password: str, full_name: str, role: str, status_value: str) -> User:
        normalized_email = email.strip().lower()
        if role not in ROLE_ORDER or status_value not in {"active", "inactive", "suspended"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role or status")
        if not can_manage_role(actor, role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if self.db.query(User).filter(User.email == normalized_email, User.deleted_at.is_(None)).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        user = User(
            email=normalized_email,
            username=normalized_email,
            name=full_name,
            full_name=full_name,
            password_hash=hash_password(password),
            role=role,
            status=status_value,
            created_by=actor.id,
            updated_by=actor.id,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_user(self, user_id: int) -> User:
        user = self.db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def update_user(self, actor: User, user_id: int, *, full_name: str | None, email: str | None) -> User:
        user = self.get_user(user_id)
        if email:
            normalized_email = email.strip().lower()
            duplicate = (
                self.db.query(User)
                .filter(User.email == normalized_email, User.id != user_id, User.deleted_at.is_(None))
                .first()
            )
            if duplicate:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
            user.email = normalized_email
            user.username = normalized_email
        if full_name is not None:
            user.full_name = full_name
            user.name = full_name
        user.updated_by = actor.id
        self.db.commit()
        self.db.refresh(user)
        return user

    def change_role(self, actor: User, user_id: int, role: str) -> User:
        if role not in ROLE_ORDER:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        user = self.get_user(user_id)
        if not can_manage_role(actor, role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if user.role == "super_admin" and role != "super_admin":
            remaining = (
                self.db.query(User)
                .filter(User.role == "super_admin", User.deleted_at.is_(None), User.id != user.id)
                .count()
            )
            if remaining == 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot downgrade last super_admin")
        user.role = role
        user.updated_by = actor.id
        self.db.commit()
        self.db.refresh(user)
        return user

    def change_status(self, actor: User, user_id: int, status_value: str) -> User:
        if status_value not in {"active", "inactive", "suspended"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
        user = self.get_user(user_id)
        if actor.id == user.id and status_value != "active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
        if user.role == "super_admin" and status_value != "active":
            remaining = (
                self.db.query(User)
                .filter(User.role == "super_admin", User.deleted_at.is_(None), User.id != user.id)
                .count()
            )
            if remaining == 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate last super_admin")
        user.status = status_value
        user.updated_by = actor.id
        self.db.commit()
        self.db.refresh(user)
        return user

    def reset_password(self, actor: User, user_id: int, password: str) -> None:
        user = self.get_user(user_id)
        user.password_hash = hash_password(password)
        user.updated_by = actor.id
        self.db.commit()

    def deactivate_user(self, actor: User, user_id: int) -> None:
        user = self.get_user(user_id)
        if actor.id == user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
        if user.role == "super_admin":
            remaining = (
                self.db.query(User)
                .filter(User.role == "super_admin", User.deleted_at.is_(None), User.id != user.id)
                .count()
            )
            if remaining == 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete last super_admin")
        user.status = "inactive"
        user.deleted_at = _utcnow()
        user.updated_by = actor.id
        self.db.commit()
