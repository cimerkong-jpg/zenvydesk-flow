from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.admin_user import (
    AdminCreateUserRequest,
    AdminResetPasswordRequest,
    AdminRoleUpdateRequest,
    AdminStatusUpdateRequest,
    AdminUpdateUserRequest,
    UserListResponse,
)
from app.schemas.auth import MessageResponse, UserResponse
from app.services.permission_service import require_roles
from app.services.user_admin_service import UserAdminService


router = APIRouter(prefix="/api/v1/admin/users", tags=["admin-users"])


@router.get("/", response_model=UserListResponse)
def list_users(
    keyword: str | None = Query(default=None),
    role: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    items, total = UserAdminService(db).list_users(keyword, role, status_value, page, page_size)
    return {"items": items, "total": total}


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminCreateUserRequest,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    return UserAdminService(db).create_user(
        current_user,
        payload.email,
        payload.password,
        payload.full_name,
        payload.role,
        payload.status,
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    return UserAdminService(db).get_user(user_id)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: AdminUpdateUserRequest,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    return UserAdminService(db).update_user(current_user, user_id, full_name=payload.full_name, email=payload.email)


@router.patch("/{user_id}/role", response_model=UserResponse)
def change_role(
    user_id: int,
    payload: AdminRoleUpdateRequest,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    return UserAdminService(db).change_role(current_user, user_id, payload.role)


@router.patch("/{user_id}/status", response_model=UserResponse)
def change_status(
    user_id: int,
    payload: AdminStatusUpdateRequest,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    return UserAdminService(db).change_status(current_user, user_id, payload.status)


@router.post("/{user_id}/reset-password", response_model=MessageResponse)
def reset_password(
    user_id: int,
    payload: AdminResetPasswordRequest,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    UserAdminService(db).reset_password(current_user, user_id, payload.password)
    return {"message": "Password reset"}


@router.delete("/{user_id}", response_model=MessageResponse)
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    UserAdminService(db).deactivate_user(current_user, user_id)
    return {"message": "User deactivated"}
