"""
Posting Service
Handles the workflow of posting content to Facebook from drafts
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.models.facebook_page import FacebookPage
from app.services.facebook_poster import FacebookPoster, FacebookPostResult

logger = logging.getLogger(__name__)


class PostingService:
    """
    Service for posting content to Facebook
    Handles the workflow from Draft to PostHistory with safe failure handling
    """
    
    def __init__(self, db: Session, mock_mode: bool = False):
        """
        Initialize posting service
        
        Args:
            db: Database session
            mock_mode: If True, use mock Facebook API
        """
        self.db = db
        self.facebook_poster = FacebookPoster(mock_mode=mock_mode)
    
    def post_draft_to_facebook(
        self,
        draft_id: int,
        user_id: int
    ) -> tuple[bool, Optional[PostHistory], Optional[str]]:
        """
        Post a draft to Facebook
        
        Args:
            draft_id: ID of the draft to post
            user_id: ID of the user posting
        
        Returns:
            Tuple of (success, post_history, error_message)
            - success: True if posting succeeded
            - post_history: PostHistory record if created, None otherwise
            - error_message: Error message if failed, None otherwise
        """
        # Get draft
        draft = self.db.query(Draft).filter(
            Draft.id == draft_id,
            Draft.user_id == user_id
        ).first()
        
        if not draft:
            error_msg = f"Draft {draft_id} not found for user {user_id}"
            logger.error(error_msg)
            return False, None, error_msg
        
        # Get Facebook page
        page = self.db.query(FacebookPage).filter(
            FacebookPage.id == draft.page_id,
            FacebookPage.user_id == user_id
        ).first()
        
        if not page:
            error_msg = f"Facebook page {draft.page_id} not found for user {user_id}"
            logger.error(error_msg)
            return False, None, error_msg
        
        # Check if page has access token
        if not page.access_token:
            error_msg = f"Facebook page {draft.page_id} has no access token"
            logger.error(error_msg)
            return False, None, error_msg
        
        # Post to Facebook
        logger.info(f"Posting draft {draft_id} to Facebook page {page.page_id}")
        result: FacebookPostResult = self.facebook_poster.post_to_page(
            page_id=page.page_id,
            access_token=page.access_token,
            message=draft.content,
            link=draft.media_url  # Use media_url as link if present
        )
        
        # Handle result
        if result.success:
            # Success - create PostHistory and update draft status
            logger.info(f"Successfully posted draft {draft_id} to Facebook. Post ID: {result.post_id}")
            
            post_history = PostHistory(
                user_id=user_id,
                page_id=draft.page_id,
                draft_id=draft_id,
                content=draft.content,
                media_url=draft.media_url,
                post_status="posted",
                error_message=None
            )
            self.db.add(post_history)
            
            # Update draft status
            draft.status = "posted"
            
            self.db.commit()
            self.db.refresh(post_history)
            
            return True, post_history, None
        else:
            # Failure - log error but DO NOT create corrupt PostHistory
            error_msg = f"Facebook posting failed: {result.error_message} (code: {result.error_code})"
            logger.error(f"Failed to post draft {draft_id}: {error_msg}")
            
            # Update draft status to indicate failure
            draft.status = "post_failed"
            self.db.commit()
            
            # Return failure without creating PostHistory
            return False, None, error_msg
