"""
Test endpoint for scheduled posting execution
Allows manual triggering of scheduled posting worker
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict

from app.core.database import get_db
from app.services.scheduled_posting_worker import ScheduledPostingWorker, ScheduledPostingResult


router = APIRouter(prefix="/api/v1/test", tags=["test"])


class RunScheduledResponse(BaseModel):
    """Response for run-scheduled endpoint"""
    success: bool
    processed_count: int
    posted_count: int
    failed_count: int
    skipped_count: int
    errors: List[Dict[str, str]]


@router.post("/run-scheduled", response_model=RunScheduledResponse)
def run_scheduled_posting(
    mock_mode: bool = True,
    db: Session = Depends(get_db)
):
    """
    Manually trigger scheduled posting worker
    
    Args:
        mock_mode: If True, use mock mode for Facebook posting (default: True)
        db: Database session
    
    Returns:
        RunScheduledResponse with execution results
    """
    # Initialize worker
    worker = ScheduledPostingWorker(mock_mode=mock_mode)
    
    # Process due drafts
    result = worker.process_due_drafts(db)
    
    # Return response
    return RunScheduledResponse(
        success=result.success,
        processed_count=result.processed_count,
        posted_count=result.posted_count,
        failed_count=result.failed_count,
        skipped_count=result.skipped_count,
        errors=result.errors
    )
