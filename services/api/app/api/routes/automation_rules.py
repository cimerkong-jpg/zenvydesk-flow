from fastapi import APIRouter, Depends, HTTPException
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
        product_id=rule.product_id,
        content_library_id=rule.content_library_id,
        name=rule.name,
        content_type=rule.content_type,
        tone=rule.tone,
        language=rule.language,
        style=rule.style,
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


@router.put("/{rule_id}", response_model=AutomationRuleResponse)
def update_automation_rule(
    rule_id: int,
    rule: AutomationRuleCreate,
    db: Session = Depends(get_db),
):
    db_rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    db_rule.page_id = rule.page_id
    db_rule.product_id = rule.product_id
    db_rule.content_library_id = rule.content_library_id
    db_rule.name = rule.name
    db_rule.content_type = rule.content_type
    db_rule.tone = rule.tone
    db_rule.language = rule.language
    db_rule.style = rule.style
    db_rule.auto_post = rule.auto_post
    db_rule.scheduled_time = rule.scheduled_time
    db_rule.product_selection_mode = rule.product_selection_mode
    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.delete("/{rule_id}")
def delete_automation_rule(rule_id: int, db: Session = Depends(get_db)):
    db_rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    db.delete(db_rule)
    db.commit()
    return {"message": "Automation rule deleted successfully"}
