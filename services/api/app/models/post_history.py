from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.core.database import Base


class PostHistory(Base):
    __tablename__ = "post_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page_id = Column(Integer, ForeignKey("facebook_pages.id"), nullable=False)
    draft_id = Column(Integer, ForeignKey("drafts.id"), nullable=True)
    content = Column(String, nullable=False)
    media_url = Column(String, nullable=True)
    post_status = Column(String, nullable=False)
    error_message = Column(String, nullable=True)
    posted_at = Column(DateTime, default=datetime.utcnow)
