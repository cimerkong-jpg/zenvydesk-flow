from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page_id = Column(Integer, ForeignKey("facebook_pages.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    content_library_id = Column(Integer, ForeignKey("content_library.id"), nullable=True)

    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    content_type = Column(String, nullable=True)
    market = Column(String, nullable=True)
    tone = Column(String, nullable=True)
    language = Column(String, nullable=True)
    style = Column(String, nullable=True)
    auto_post = Column(Boolean, default=True)
    
    scheduled_time = Column(String, nullable=False)
    product_selection_mode = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
