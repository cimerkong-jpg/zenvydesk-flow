from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.core.database import Base


class UserAiApiKey(Base):
    __tablename__ = "user_ai_api_keys"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_ai_api_keys_user_provider"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)
    encrypted_api_key = Column(String, nullable=False)
    key_hint = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    last_validated_at = Column(DateTime, nullable=True)
    validation_status = Column(String, nullable=True, default="unknown")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
