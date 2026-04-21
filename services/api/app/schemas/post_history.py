from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class PostHistoryBase(BaseModel):
    content: str
    media_url: Optional[str] = None
    page_id: int
    draft_id: Optional[int] = None
    post_status: str
    error_message: Optional[str] = None


class PostHistoryCreate(PostHistoryBase):
    pass


class PostHistoryResponse(PostHistoryBase):
    id: int
    user_id: int
    posted_at: datetime

    class Config:
        from_attributes = True
