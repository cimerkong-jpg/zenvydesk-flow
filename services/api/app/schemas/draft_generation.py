from pydantic import BaseModel
from typing import Optional


class DraftGenerateRequest(BaseModel):
    product_id: int
    content_library_id: Optional[int] = None
    tone: str = "marketing"
    language: str = "th"
    style: Optional[str] = None


class DraftGenerateResponse(BaseModel):
    content: str
    media_url: Optional[str] = None
