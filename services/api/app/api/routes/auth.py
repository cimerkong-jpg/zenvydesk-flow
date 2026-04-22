from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import AuthUserResponse, LoginRequest, LoginResponse
from app.services.auth_service import clear_session, create_session, get_user_by_session, verify_password


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    prefix = "bearer "
    if authorization.lower().startswith(prefix):
        return authorization[len(prefix):].strip()
    return None


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.username == payload.username.strip().lower())
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_session(db, user)
    return LoginResponse(
        token=token,
        expires_at=user.session_expires_at,
        user=AuthUserResponse(
            id=user.id,
            username=user.username or "",
            email=user.email,
            name=user.name,
        ),
    )


@router.get("/me", response_model=AuthUserResponse)
def me(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _extract_bearer_token(authorization)
    user = get_user_by_session(db, token or "")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return AuthUserResponse(
        id=user.id,
        username=user.username or "",
        email=user.email,
        name=user.name,
    )


@router.post("/logout")
def logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _extract_bearer_token(authorization)
    user = get_user_by_session(db, token or "")
    if user:
        clear_session(db, user)
    return {"message": "Logged out"}
