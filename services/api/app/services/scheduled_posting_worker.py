"""
Scheduled Posting Worker - First Slice
Processes drafts that are scheduled and due for posting
Simple implementation without queue system
"""
from typing import List, Dict, Optional
from datetime import datetime
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.models.facebook_page import FacebookPage
from app.services.facebook_poster import FacebookPoster, FacebookPostResult


@dataclass
class ScheduledPostingResult:
    """Result of scheduled posting execution"""
    success: bool
    processed_count: int = 0
    posted_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    errors: List[Dict[str, str]] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class ScheduledPostingWorker:
    """
    Worker for processing scheduled drafts
    First slice: simple query and post without queue
    """
    
    def __init__(self, mock_mode: bool = False):
        """
        Initialize scheduled posting worker
        
        Args:
            mock_mode: If True, use mock mode for posting
        """
        self.mock_mode = mock_mode
        self.poster = FacebookPoster(mock_mode=mock_mode)
    
    def process_due_drafts(self, db: Session) -> ScheduledPostingResult:
        """
        Process all drafts that are due for posting
        
        Args:
            db: Database session
        
        Returns:
            ScheduledPostingResult with execution summary
        """
        result = ScheduledPostingResult(success=True)
        
        try:
            # Query drafts that are due for posting
            due_drafts = self._get_due_drafts(db)
            result.processed_count = len(due_drafts)
            
            # Process each draft
            for draft in due_drafts:
                post_result = self._process_single_draft(db, draft)
                
                if post_result["status"] == "posted":
                    result.posted_count += 1
                elif post_result["status"] == "failed":
                    result.failed_count += 1
                    result.errors.append({
                        "draft_id": str(draft.id),
                        "error": post_result.get("error", "Unknown error")
                    })
                elif post_result["status"] == "skipped":
                    result.skipped_count += 1
            
            return result
        
        except Exception as e:
            result.success = False
            result.errors.append({"error": f"Worker error: {str(e)}"})
            return result
    
    def _get_due_drafts(self, db: Session) -> List[Draft]:
        """
        Get all drafts that are due for posting
        
        Criteria:
        - status = 'scheduled'
        - scheduled_time <= now
        - is_active = True
        - not already posted (no post_history with this draft_id and post_status='success')
        """
        now = datetime.utcnow()
        
        # Get scheduled drafts that are due
        due_drafts = db.query(Draft).filter(
            Draft.status == "scheduled",
            Draft.scheduled_time <= now,
            Draft.is_active == True
        ).all()
        
        # Filter out already posted drafts (basic double-processing prevention)
        filtered_drafts = []
        for draft in due_drafts:
            # Check if already posted
            existing_post = db.query(PostHistory).filter(
                PostHistory.draft_id == draft.id,
                PostHistory.post_status == "success"
            ).first()
            
            if not existing_post:
                filtered_drafts.append(draft)
        
        return filtered_drafts
    
    def _process_single_draft(self, db: Session, draft: Draft) -> Dict[str, str]:
        """
        Process a single draft for posting
        
        Args:
            db: Database session
            draft: Draft to process
        
        Returns:
            Dict with status and optional error
        """
        try:
            # Get page information
            page = db.query(FacebookPage).filter(
                FacebookPage.id == draft.page_id,
                FacebookPage.is_active == True
            ).first()
            
            if not page:
                return {"status": "skipped", "error": "Page not found or inactive"}
            
            if not page.access_token:
                return {"status": "skipped", "error": "No access token for page"}
            
            # Post to Facebook
            post_result = self.poster.post_to_page(
                page_id=page.page_id,
                access_token=page.access_token,
                message=draft.content,
                link=draft.media_url
            )
            
            # Create post history record
            if post_result.success:
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
                
                db.commit()
                return {"status": "posted", "post_id": post_result.post_id}
            else:
                # Record failure
                post_history = PostHistory(
                    user_id=draft.user_id,
                    page_id=draft.page_id,
                    draft_id=draft.id,
                    content=draft.content,
                    media_url=draft.media_url,
                    post_status="failed",
                    error_message=post_result.error_message
                )
                db.add(post_history)
                
                # Update draft status
                draft.status = "failed"
                
                db.commit()
                return {"status": "failed", "error": post_result.error_message}
        
        except Exception as e:
            # Rollback on error
            db.rollback()
            return {"status": "failed", "error": str(e)}
