from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import UserResponse


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int


class AdminCreateUserRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=200)
    role: str = "member"
    status: str = "active"


class AdminUpdateUserRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    email: str | None = None


class AdminRoleUpdateRequest(BaseModel):
    role: str


class AdminStatusUpdateRequest(BaseModel):
    status: str


class AdminResetPasswordRequest(BaseModel):
    password: str = Field(min_length=8)


class AdminUserDetailResponse(UserResponse):
    updated_at: datetime | None = None
