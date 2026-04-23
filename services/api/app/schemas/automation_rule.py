from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class AutomationRuleBase(BaseModel):
    page_id: int
    name: str
    product_id: Optional[int] = None
    content_library_id: Optional[int] = None
    content_type: Optional[str] = None
    market: Optional[str] = "TH"
    tone: Optional[str] = None
    language: Optional[str] = None
    style: Optional[str] = None
    auto_post: bool = True
    scheduled_time: str
    product_selection_mode: Optional[str] = None


class AutomationRuleCreate(AutomationRuleBase):
    pass


class AutomationRuleResponse(AutomationRuleBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
