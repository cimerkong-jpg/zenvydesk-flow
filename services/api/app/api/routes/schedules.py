from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.draft import Draft
from app.models.user import User
from app.schemas.draft import DraftResponse
from app.schemas.schedule import ScheduleUpdate
from app.services.permission_service import get_current_user

router = APIRouter()


@router.get("/", response_model=List[DraftResponse])
def get_scheduled_drafts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    drafts = (
        db.query(Draft)
        .filter(Draft.user_id == current_user.id, Draft.scheduled_time.isnot(None))
        .order_by(Draft.scheduled_time.desc(), Draft.id.desc())
        .all()
    )
    return drafts


@router.post("/{draft_id}", response_model=DraftResponse)
def schedule_draft(
    draft_id: int,
    schedule: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    draft = db.query(Draft).filter(Draft.id == draft_id, Draft.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    draft.scheduled_time = schedule.scheduled_time
    draft.status = "scheduled"
    db.commit()
    db.refresh(draft)
    return draft
