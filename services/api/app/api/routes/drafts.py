from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.draft import Draft
from app.schemas.draft import DraftCreate, DraftResponse

router = APIRouter()


@router.post("/", response_model=DraftResponse)
def create_draft(draft: DraftCreate, db: Session = Depends(get_db)):
    """Create new draft"""
    db_draft = Draft(
        user_id=1,  # Hardcoded for now
        page_id=draft.page_id,
        product_id=draft.product_id,
        content=draft.content,
        media_url=draft.media_url,
        status="draft",  # Default status
        scheduled_time=draft.scheduled_time
    )
    db.add(db_draft)
    db.commit()
    db.refresh(db_draft)
    return db_draft


@router.get("/", response_model=List[DraftResponse])
def get_drafts(db: Session = Depends(get_db)):
    """Get all drafts"""
    drafts = db.query(Draft).all()
    return drafts
