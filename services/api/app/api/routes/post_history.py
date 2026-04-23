from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.post_history import PostHistory
from app.models.user import User
from app.schemas.post_history import PostHistoryCreate, PostHistoryResponse
from app.services.permission_service import get_current_user

router = APIRouter()


@router.post("/", response_model=PostHistoryResponse)
def create_post_history(
    history: PostHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_history = PostHistory(
        user_id=current_user.id,
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
def get_post_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = (
        db.query(PostHistory)
        .filter(PostHistory.user_id == current_user.id)
        .order_by(PostHistory.posted_at.desc())
        .all()
    )
    return history
