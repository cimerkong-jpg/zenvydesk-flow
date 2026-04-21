from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class ContentLibraryBase(BaseModel):
    title: Optional[str] = None
    content: str
    content_type: Optional[str] = None


class ContentLibraryCreate(ContentLibraryBase):
    pass


class ContentLibraryResponse(ContentLibraryBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
