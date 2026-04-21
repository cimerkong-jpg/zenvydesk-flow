from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.automation_rule import AutomationRule
from app.schemas.automation_rule import AutomationRuleCreate, AutomationRuleResponse

router = APIRouter()


@router.post("/", response_model=AutomationRuleResponse)
def create_automation_rule(rule: AutomationRuleCreate, db: Session = Depends(get_db)):
    """Create automation rule"""
    db_rule = AutomationRule(
        user_id=1,  # Hardcoded for now
        page_id=rule.page_id,
        name=rule.name,
        content_type=rule.content_type,
        auto_post=rule.auto_post,
        scheduled_time=rule.scheduled_time,
        product_selection_mode=rule.product_selection_mode
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.get("/", response_model=List[AutomationRuleResponse])
def get_automation_rules(db: Session = Depends(get_db)):
    """Get all automation rules"""
    rules = db.query(AutomationRule).all()
    return rules
