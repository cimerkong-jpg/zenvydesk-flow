from datetime import datetime
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthUserResponse(BaseModel):
    id: int
    username: str
    email: str
    name: str | None = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    token: str
    expires_at: datetime | None = None
    user: AuthUserResponse
