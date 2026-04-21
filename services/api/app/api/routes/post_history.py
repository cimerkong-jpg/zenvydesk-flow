from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.post_history import PostHistory
from app.schemas.post_history import PostHistoryCreate, PostHistoryResponse

router = APIRouter()


@router.post("/", response_model=PostHistoryResponse)
def create_post_history(history: PostHistoryCreate, db: Session = Depends(get_db)):
    """Create post history record"""
    db_history = PostHistory(
        user_id=1,  # Hardcoded for now
        page_id=history.page_id,
        draft_id=history.draft_id,
        content=history.content,
        media_url=history.media_url,
        post_status=history.post_status,
        error_message=history.error_message
    )
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history


@router.get("/", response_model=List[PostHistoryResponse])
def get_post_history(db: Session = Depends(get_db)):
    """Get all post history"""
    history = db.query(PostHistory).all()
    return history
