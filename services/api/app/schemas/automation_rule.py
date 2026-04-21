from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class AutomationRuleBase(BaseModel):
    page_id: int
    name: str
    content_type: Optional[str] = None
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
