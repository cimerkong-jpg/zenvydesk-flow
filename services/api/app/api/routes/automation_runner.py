import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.automation_rule import AutomationRule
from app.models.content_library import ContentLibrary
from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.models.product import Product
from app.services.ai.content_generator import generate_content
from app.services.ai.image_generator import generate_image

router = APIRouter()
logger = logging.getLogger(__name__)


def _pick_product(rule: AutomationRule, db: Session) -> Optional[Product]:
    query = db.query(Product).filter(Product.user_id == rule.user_id)
    if rule.product_id:
        return query.filter(Product.id == rule.product_id).first()
    if rule.product_selection_mode == "newest":
        return query.order_by(Product.created_at.desc()).first()
    if rule.product_selection_mode == "oldest":
        return query.order_by(Product.created_at.asc()).first()
    return query.first()


@router.post("/run/{rule_id}")
def run_automation(rule_id: int, db: Session = Depends(get_db)):
    """Run automation rule: generate content, create draft, optionally create post history."""
    logger.info("Automation runner started: rule_id=%s", rule_id)

    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        logger.error("Automation rule not found: rule_id=%s", rule_id)
        raise HTTPException(status_code=404, detail="Automation rule not found")

    product = _pick_product(rule, db)
    if not product:
        logger.error("No product found: rule_id=%s, user_id=%s", rule_id, rule.user_id)
        raise HTTPException(status_code=404, detail="No product found")

    content_library = None
    if rule.content_library_id:
        content_library = (
            db.query(ContentLibrary)
            .filter(
                ContentLibrary.id == rule.content_library_id,
                ContentLibrary.user_id == rule.user_id,
            )
            .first()
        )

    logger.info(
        "Automation context: rule_id=%s, page_id=%s, product_id=%s, content_library_id=%s",
        rule_id,
        rule.page_id,
        product.id,
        content_library.id if content_library else None,
    )

    generated = generate_content(
        product=product,
        content_library=content_library,
        tone=rule.tone or rule.content_type or "marketing",
        language=rule.language or "th",
    )
    if not generated.content.strip():
        logger.error("AI generation returned empty content: rule_id=%s", rule_id)
        return {
            "rule_id": rule_id,
            "draft_id": None,
            "post_history_id": None,
            "status": "generation_failed",
            "error": "Draft generation returned empty content",
            "provider": "service-layer",
            "model": "derived",
        }

    media_prompt = "\n".join(
        [
            generated.prompt,
            f"Visual style: {rule.style or 'social ad creative'}",
            f"Draft content context: {generated.content}",
        ]
    )
    media_url = generate_image(media_prompt)

    draft = Draft(
        user_id=rule.user_id,
        page_id=rule.page_id,
        product_id=product.id,
        content_library_id=content_library.id if content_library else None,
        content=generated.content,
        media_url=media_url or product.image_url,
        status="draft",
        scheduled_time=None,
    )
    db.add(draft)
    db.flush()

    logger.info("Draft created: draft_id=%s, rule_id=%s", draft.id, rule_id)

    post_history_id: Optional[int] = None
    status = "draft_created"

    if rule.auto_post:
        post_history = PostHistory(
            user_id=rule.user_id,
            page_id=rule.page_id,
            draft_id=draft.id,
            content=draft.content,
            media_url=draft.media_url,
            post_status="success",
            error_message=None,
        )
        db.add(post_history)
        db.flush()
        draft.status = "posted"
        post_history_id = post_history.id
        status = "posted"
        logger.info("Post history created: post_history_id=%s, draft_id=%s", post_history_id, draft.id)

    db.commit()

    logger.info("Automation completed: rule_id=%s, status=%s, draft_id=%s", rule_id, status, draft.id)
    return {
        "rule_id": rule_id,
        "draft_id": draft.id,
        "post_history_id": post_history_id,
        "status": status,
        "provider": "service-layer",
        "model": "derived",
    }
