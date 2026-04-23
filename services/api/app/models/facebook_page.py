from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.core.database import Base


class FacebookPage(Base):
    __tablename__ = "facebook_pages"
    __table_args__ = (
        UniqueConstraint("user_id", "page_id", name="uq_facebook_page_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page_id = Column(String, index=True, nullable=False)
    page_name = Column(String, nullable=False)
    access_token = Column(String, nullable=True)
    category = Column(String, nullable=True)
    tasks = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
