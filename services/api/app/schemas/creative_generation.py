from typing import Literal, Optional

from pydantic import BaseModel


class CreativeGenerateRequest(BaseModel):
    product_id: int
    content_library_id: Optional[int] = None
    market: Optional[str] = "TH"
    user_prompt: str


class CreativeGenerateResponse(BaseModel):
    content: str
    media_url: Optional[str] = None
    ai_provider: str
    ai_model: str
    image_provider: str
    image_model: str
