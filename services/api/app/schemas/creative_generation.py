from typing import Literal, Optional

from pydantic import BaseModel


class CreativeGenerateRequest(BaseModel):
    generation_type: Literal["post", "image", "content"] = "post"
    product_id: int
    content_library_id: Optional[int] = None
    tone: str = "marketing"
    language: str = "th"
    style: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_base_url: Optional[str] = None
    image_provider: Optional[str] = None
    image_model: Optional[str] = None
    image_api_key: Optional[str] = None
    image_base_url: Optional[str] = None


class CreativeGenerateResponse(BaseModel):
    generation_type: Literal["post", "image", "content"]
    content: str
    media_url: Optional[str] = None
    ai_provider: str
    ai_model: str
    image_provider: str
    image_model: str
