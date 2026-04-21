from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from datetime import datetime
from app.core.database import Base


class Schedule(Base):
    """
    Schedule model for automation rule execution
    Tracks when automation rules should be executed
    """
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    automation_rule_id = Column(Integer, ForeignKey("automation_rules.id"), nullable=False)
    
    # Scheduling info
    next_run_at = Column(DateTime, nullable=False, index=True)
    last_run_at = Column(DateTime, nullable=True)
    
    # Status tracking
    is_active = Column(Boolean, default=True)
    status = Column(String, default="pending")  # pending, running, completed, failed
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
