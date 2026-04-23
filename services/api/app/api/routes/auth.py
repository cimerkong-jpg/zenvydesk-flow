from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthTokensResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.services.permission_service import get_current_user


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=AuthTokensResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    return AuthService(db).register(payload.email, payload.password, payload.full_name, request)


@router.post("/login", response_model=AuthTokensResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    return AuthService(db).login(payload.email, payload.password, request)


@router.post("/refresh", response_model=AuthTokensResponse)
def refresh(payload: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)):
    return AuthService(db).refresh(payload.refresh_token, request)


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: LogoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    AuthService(db).logout(current_user, payload.refresh_token, payload.revoke_all)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    AuthService(db).change_password(current_user, payload.current_password, payload.new_password)
    return {"message": "Password changed"}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    reset_token = AuthService(db).forgot_password(payload.email)
    return {
        "message": "If the account exists, a reset token has been generated.",
        "reset_token": reset_token if settings.resolved_app_env != "production" else None,
    }


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).reset_password(payload.token, payload.password)
    return {"message": "Password reset successful"}
