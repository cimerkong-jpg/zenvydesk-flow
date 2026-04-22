from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class DraftBase(BaseModel):
    content: str
    media_url: Optional[str] = None
    page_id: Optional[int] = None
    product_id: Optional[int] = None
    content_library_id: Optional[int] = None
    scheduled_time: Optional[datetime] = None


class DraftCreate(DraftBase):
    pass


class DraftResponse(DraftBase):
    id: int
    user_id: int
    status: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
