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


@router.put("/{draft_id}", response_model=DraftResponse)
def update_draft(draft_id: int, draft: DraftCreate, db: Session = Depends(get_db)):
    """Update draft"""
    db_draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not db_draft:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Draft not found")
    
    db_draft.page_id = draft.page_id
    db_draft.product_id = draft.product_id
    db_draft.content = draft.content
    db_draft.media_url = draft.media_url
    db_draft.scheduled_time = draft.scheduled_time
    
    db.commit()
    db.refresh(db_draft)
    return db_draft


@router.delete("/{draft_id}")
def delete_draft(draft_id: int, db: Session = Depends(get_db)):
    """Delete draft"""
    db_draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not db_draft:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Draft not found")
    
    db.delete(db_draft)
    db.commit()
    return {"message": "Draft deleted successfully"}
