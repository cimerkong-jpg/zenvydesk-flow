from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now()


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def _token_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _sign_jwt(payload: dict[str, Any]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_segment = _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    signature = hmac.new(settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_segment}.{payload_segment}.{_b64url_encode(signature)}"


def _decode_jwt(token: str) -> dict[str, Any]:
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    expected = hmac.new(settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, _b64url_decode(signature_segment)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    payload = json.loads(_b64url_decode(payload_segment))
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    return payload


def create_access_token(user: User) -> str:
    issued_at = _utcnow()
    expires_at = issued_at + timedelta(minutes=settings.access_token_expiry_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "type": "access",
        "jti": secrets.token_hex(8),
        "exp": int(expires_at.timestamp()),
        "iat": int(issued_at.timestamp()),
    }
    return _sign_jwt(payload)


def _issue_refresh_token(db: Session, user: User, request: Request | None = None) -> str:
    raw_token = secrets.token_urlsafe(48)
    token = RefreshToken(
        user_id=user.id,
        token_hash=_token_hash(raw_token),
        expires_at=_utcnow() + timedelta(days=settings.refresh_token_expiry_days),
        created_by_ip=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(token)
    db.commit()
    return raw_token


def _serialize_user(user: User) -> User:
    user.full_name = user.full_name or user.name
    return user


class AuthService:
    _login_attempts: dict[str, list[float]] = {}

    def __init__(self, db: Session):
        self.db = db

    def _check_login_rate_limit(self, email: str) -> None:
        now = time.time()
        window_start = now - 60
        attempts = [attempt for attempt in self._login_attempts.get(email, []) if attempt >= window_start]
        if len(attempts) >= 5:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts")
        attempts.append(now)
        self._login_attempts[email] = attempts

    def register(self, email: str, password: str, full_name: str, request: Request | None = None) -> dict[str, Any]:
        normalized_email = email.strip().lower()
        if self.db.query(User).filter(User.email == normalized_email).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        user = User(
            email=normalized_email,
            username=normalized_email,
            name=full_name,
            full_name=full_name,
            password_hash=hash_password(password),
            role="member",
            status="active",
            is_email_verified=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self._build_auth_response(user, request)

    def login(self, email: str, password: str, request: Request | None = None) -> dict[str, Any]:
        normalized_email = email.strip().lower()
        self._check_login_rate_limit(normalized_email)
        user = self.db.query(User).filter(User.email == normalized_email, User.deleted_at.is_(None)).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not active")

        user.last_login_at = _utcnow()
        self.db.commit()
        self.db.refresh(user)
        return self._build_auth_response(user, request)

    def refresh(self, refresh_token: str, request: Request | None = None) -> dict[str, Any]:
        token_hash = _token_hash(refresh_token)
        token_row = (
            self.db.query(RefreshToken)
            .filter(RefreshToken.token_hash == token_hash, RefreshToken.revoked_at.is_(None))
            .first()
        )
        if not token_row or token_row.expires_at < _utcnow():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user = self.db.query(User).filter(User.id == token_row.user_id, User.deleted_at.is_(None)).first()
        if not user or user.status != "active":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        token_row.revoked_at = _utcnow()
        self.db.commit()
        return self._build_auth_response(user, request)

    def logout(self, user: User, refresh_token: str | None = None, revoke_all: bool = False) -> None:
        query = self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        )
        if not revoke_all and refresh_token:
            query = query.filter(RefreshToken.token_hash == _token_hash(refresh_token))
        for row in query.all():
            row.revoked_at = _utcnow()
        self.db.commit()

    def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        user.password_hash = hash_password(new_password)
        self.db.query(RefreshToken).filter(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)).update(
            {RefreshToken.revoked_at: _utcnow()}
        )
        self.db.commit()

    def forgot_password(self, email: str) -> str | None:
        normalized_email = email.strip().lower()
        user = self.db.query(User).filter(User.email == normalized_email, User.deleted_at.is_(None)).first()
        if not user:
            return None

        raw_token = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=_token_hash(raw_token),
            expires_at=_utcnow() + timedelta(minutes=settings.password_reset_expiry_minutes),
        )
        self.db.add(reset_token)
        self.db.commit()
        return raw_token

    def reset_password(self, token: str, new_password: str) -> None:
        row = (
            self.db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.token_hash == _token_hash(token),
                PasswordResetToken.used_at.is_(None),
            )
            .first()
        )
        if not row or row.expires_at < _utcnow():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

        user = self.db.query(User).filter(User.id == row.user_id, User.deleted_at.is_(None)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

        user.password_hash = hash_password(new_password)
        row.used_at = _utcnow()
        self.db.query(RefreshToken).filter(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)).update(
            {RefreshToken.revoked_at: _utcnow()}
        )
        self.db.commit()

    def get_current_user(self, token: str) -> User:
        payload = _decode_jwt(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        user = self.db.query(User).filter(User.id == int(payload["sub"]), User.deleted_at.is_(None)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        if user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not active")
        return _serialize_user(user)

    def _build_auth_response(self, user: User, request: Request | None = None) -> dict[str, Any]:
        access_token = create_access_token(user)
        refresh_token = _issue_refresh_token(self.db, user, request)
        return {
            "user": _serialize_user(user),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
