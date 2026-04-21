from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.draft import Draft
from app.schemas.draft import DraftResponse
from app.schemas.schedule import ScheduleUpdate

router = APIRouter()


@router.get("/", response_model=List[DraftResponse])
def get_scheduled_drafts(db: Session = Depends(get_db)):
    """Get all drafts with scheduled time"""
    drafts = db.query(Draft).filter(Draft.scheduled_time.isnot(None)).all()
    return drafts


@router.post("/{draft_id}", response_model=DraftResponse)
def schedule_draft(draft_id: int, schedule: ScheduleUpdate, db: Session = Depends(get_db)):
    """Schedule a draft for posting"""
    
    # Find draft
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Update draft
    draft.scheduled_time = schedule.scheduled_time
    draft.status = "scheduled"
    
    # Commit changes
    db.commit()
    db.refresh(draft)
    
    return draft
