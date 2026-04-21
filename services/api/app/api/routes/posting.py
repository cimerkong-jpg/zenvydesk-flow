from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.schemas.post_history import PostHistoryResponse

router = APIRouter()


@router.post("/from-draft/{draft_id}", response_model=PostHistoryResponse)
def post_from_draft(draft_id: int, db: Session = Depends(get_db)):
    """Fake posting: Convert draft to post history"""
    
    # Find draft
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Create post history record
    post_history = PostHistory(
        user_id=draft.user_id,
        page_id=draft.page_id,
        draft_id=draft.id,
        content=draft.content,
        media_url=draft.media_url,
        post_status="success",
        error_message=None
    )
    db.add(post_history)
    
    # Update draft status
    draft.status = "posted"
    
    # Commit changes
    db.commit()
    db.refresh(post_history)
    
    return post_history
