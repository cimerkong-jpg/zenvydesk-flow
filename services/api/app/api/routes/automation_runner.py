import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.automation_rule import AutomationRule
from app.models.product import Product
from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.services.ai_generation import generate_post_content

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/run/{rule_id}")
def run_automation(rule_id: int, db: Session = Depends(get_db)):
    """Run automation rule - create draft and optionally post"""
    
    logger.info(f"Automation runner started: rule_id={rule_id}")
    
    # Find automation rule
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        logger.error(f"Automation rule not found: rule_id={rule_id}")
        raise HTTPException(status_code=404, detail="Automation rule not found")
    
    # Find a product for the user
    product = db.query(Product).filter(Product.user_id == rule.user_id).first()
    if not product:
        logger.error(f"No product found: rule_id={rule_id}, user_id={rule.user_id}")
        raise HTTPException(status_code=404, detail="No product found")
    
    logger.info(f"Automation context: rule_id={rule_id}, page_id={rule.page_id}, product_id={product.id}, content_type={rule.content_type}")
    
    # Generate content using AI service
    generation_result = generate_post_content(rule.content_type, product.name)
    
    # Check if generation failed
    if not generation_result.success:
        logger.error(f"AI generation failed: rule_id={rule_id}, error={generation_result.error}")
        return {
            "rule_id": rule_id,
            "draft_id": None,
            "post_history_id": None,
            "status": "generation_failed",
            "error": generation_result.error,
            "provider": generation_result.provider,
            "model": generation_result.model
        }
    
    # Create draft with generated content
    draft = Draft(
        user_id=rule.user_id,
        page_id=rule.page_id,
        product_id=product.id,
        content=generation_result.content,
        media_url=product.image_url,
        status="draft",
        scheduled_time=None
    )
    db.add(draft)
    db.flush()  # Get draft.id
    
    logger.info(f"Draft created: draft_id={draft.id}, rule_id={rule_id}")
    
    post_history_id: Optional[int] = None
    status = "draft_created"
    
    # If auto_post is enabled, create post history
    if rule.auto_post:
        post_history = PostHistory(
            user_id=rule.user_id,
            page_id=rule.page_id,
            draft_id=draft.id,
            content=draft.content,
            media_url=draft.media_url,
            post_status="success",
            error_message=None
        )
        db.add(post_history)
        db.flush()  # Get post_history.id
        
        # Update draft status
        draft.status = "posted"
        post_history_id = post_history.id
        status = "posted"
        
        logger.info(f"Post history created: post_history_id={post_history_id}, draft_id={draft.id}")
    
    # Commit all changes
    db.commit()
    
    logger.info(f"Automation completed: rule_id={rule_id}, status={status}, draft_id={draft.id}")
    
    return {
        "rule_id": rule_id,
        "draft_id": draft.id,
        "post_history_id": post_history_id,
        "status": status,
        "provider": generation_result.provider,
        "model": generation_result.model
    }
