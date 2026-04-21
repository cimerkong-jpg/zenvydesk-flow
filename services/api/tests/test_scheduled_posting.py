"""
Tests for Scheduled Posting Worker
Verifies due/not-due/already-processed workflow
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.facebook_page import FacebookPage
from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.services.scheduled_posting_worker import ScheduledPostingWorker
from tests.conftest import test_db


# ============================================================================
# Due Drafts Tests
# ============================================================================

def test_process_due_draft_success(test_db: Session):
    """Test processing a draft that is due for posting"""
    # Create test data
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    
    page = FacebookPage(
        id=1,
        user_id=1,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token",
        is_active=True
    )
    test_db.add(page)
    
    # Create draft that is due (scheduled 1 hour ago)
    past_time = datetime.utcnow() - timedelta(hours=1)
    draft = Draft(
        id=1,
        user_id=1,
        page_id=1,
        content="Test scheduled post",
        status="scheduled",
        scheduled_time=past_time,
        is_active=True
    )
    test_db.add(draft)
    test_db.commit()
    
    # Process with worker
    worker = ScheduledPostingWorker(mock_mode=True)
    result = worker.process_due_drafts(test_db)
    
    # Verify results
    assert result.success is True
    assert result.processed_count == 1
    assert result.posted_count == 1
    assert result.failed_count == 0
    assert result.skipped_count == 0
    
    # Verify draft status updated
    test_db.refresh(draft)
    assert draft.status == "posted"
    
    # Verify post history created
    post_history = test_db.query(PostHistory).filter(
        PostHistory.draft_id == draft.id
    ).first()
    assert post_history is not None
    assert post_history.post_status == "success"
    
    print(f"\n✓ TEST PASS: Due draft processed successfully")
    print(f"  Processed: {result.processed_count}, Posted: {result.posted_count}")


def test_process_not_due_draft(test_db: Session):
    """Test that drafts not yet due are not processed"""
    # Create test data
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    
    page = FacebookPage(
        id=1,
        user_id=1,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token",
        is_active=True
    )
    test_db.add(page)
    
    # Create draft scheduled for future (1 hour from now)
    future_time = datetime.utcnow() + timedelta(hours=1)
    draft = Draft(
        id=1,
        user_id=1,
        page_id=1,
        content="Future scheduled post",
        status="scheduled",
        scheduled_time=future_time,
        is_active=True
    )
    test_db.add(draft)
    test_db.commit()
    
    # Process with worker
    worker = ScheduledPostingWorker(mock_mode=True)
    result = worker.process_due_drafts(test_db)
    
    # Verify no drafts processed
    assert result.success is True
    assert result.processed_count == 0
    assert result.posted_count == 0
    
    # Verify draft status unchanged
    test_db.refresh(draft)
    assert draft.status == "scheduled"
    
    # Verify no post history created
    post_history_count = test_db.query(PostHistory).count()
    assert post_history_count == 0
    
    print(f"\n✓ TEST PASS: Future draft not processed")
    print(f"  Processed: {result.processed_count}")


def test_process_already_posted_draft(test_db: Session):
    """Test that already posted drafts are not processed again (double-processing prevention)"""
    # Create test data
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    
    page = FacebookPage(
        id=1,
        user_id=1,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token",
        is_active=True
    )
    test_db.add(page)
    
    # Create draft that is due
    past_time = datetime.utcnow() - timedelta(hours=1)
    draft = Draft(
        id=1,
        user_id=1,
        page_id=1,
        content="Already posted content",
        status="scheduled",
        scheduled_time=past_time,
        is_active=True
    )
    test_db.add(draft)
    
    # Create existing post history (already posted)
    existing_post = PostHistory(
        id=1,
        user_id=1,
        page_id=1,
        draft_id=1,
        content="Already posted content",
        post_status="success"
    )
    test_db.add(existing_post)
    test_db.commit()
    
    # Process with worker
    worker = ScheduledPostingWorker(mock_mode=True)
    result = worker.process_due_drafts(test_db)
    
    # Verify draft not processed again
    assert result.success is True
    assert result.processed_count == 0
    assert result.posted_count == 0
    
    # Verify only one post history record exists
    post_history_count = test_db.query(PostHistory).filter(
        PostHistory.draft_id == draft.id
    ).count()
    assert post_history_count == 1
    
    print(f"\n✓ TEST PASS: Already posted draft not processed again")
    print(f"  Processed: {result.processed_count}")


# ============================================================================
# Multiple Drafts Tests
# ============================================================================

def test_process_multiple_due_drafts(test_db: Session):
    """Test processing multiple due drafts"""
    # Create test data
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    
    page = FacebookPage(
        id=1,
        user_id=1,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token",
        is_active=True
    )
    test_db.add(page)
    
    # Create 3 due drafts
    past_time = datetime.utcnow() - timedelta(hours=1)
    for i in range(1, 4):
        draft = Draft(
            id=i,
            user_id=1,
            page_id=1,
            content=f"Test post {i}",
            status="scheduled",
            scheduled_time=past_time,
            is_active=True
        )
        test_db.add(draft)
    test_db.commit()
    
    # Process with worker
    worker = ScheduledPostingWorker(mock_mode=True)
    result = worker.process_due_drafts(test_db)
    
    # Verify all processed
    assert result.success is True
    assert result.processed_count == 3
    assert result.posted_count == 3
    assert result.failed_count == 0
    
    # Verify all post histories created
    post_history_count = test_db.query(PostHistory).count()
    assert post_history_count == 3
    
    print(f"\n✓ TEST PASS: Multiple due drafts processed")
    print(f"  Processed: {result.processed_count}, Posted: {result.posted_count}")


def test_process_mixed_drafts(test_db: Session):
    """Test processing mix of due, not-due, and already-posted drafts"""
    # Create test data
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    
    page = FacebookPage(
        id=1,
        user_id=1,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token",
        is_active=True
    )
    test_db.add(page)
    
    past_time = datetime.utcnow() - timedelta(hours=1)
    future_time = datetime.utcnow() + timedelta(hours=1)
    
    # Draft 1: Due and should be posted
    draft1 = Draft(
        id=1,
        user_id=1,
        page_id=1,
        content="Due draft",
        status="scheduled",
        scheduled_time=past_time,
        is_active=True
    )
    test_db.add(draft1)
    
    # Draft 2: Not due yet
    draft2 = Draft(
        id=2,
        user_id=1,
        page_id=1,
        content="Future draft",
        status="scheduled",
        scheduled_time=future_time,
        is_active=True
    )
    test_db.add(draft2)
    
    # Draft 3: Due but already posted
    draft3 = Draft(
        id=3,
        user_id=1,
        page_id=1,
        content="Already posted",
        status="scheduled",
        scheduled_time=past_time,
        is_active=True
    )
    test_db.add(draft3)
    
    # Existing post for draft 3
    existing_post = PostHistory(
        user_id=1,
        page_id=1,
        draft_id=3,
        content="Already posted",
        post_status="success"
    )
    test_db.add(existing_post)
    test_db.commit()
    
    # Process with worker
    worker = ScheduledPostingWorker(mock_mode=True)
    result = worker.process_due_drafts(test_db)
    
    # Verify only draft 1 processed
    assert result.success is True
    assert result.processed_count == 1
    assert result.posted_count == 1
    
    # Verify draft 1 posted
    test_db.refresh(draft1)
    assert draft1.status == "posted"
    
    # Verify draft 2 unchanged
    test_db.refresh(draft2)
    assert draft2.status == "scheduled"
    
    # Verify draft 3 unchanged
    test_db.refresh(draft3)
    assert draft3.status == "scheduled"
    
    print(f"\n✓ TEST PASS: Mixed drafts handled correctly")
    print(f"  Processed: {result.processed_count}, Posted: {result.posted_count}")


# ============================================================================
# Error Handling Tests
# ============================================================================

def test_process_draft_no_page(test_db: Session):
    """Test processing draft when page doesn't exist"""
    # Create test data
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    
    # Create draft without corresponding page
    past_time = datetime.utcnow() - timedelta(hours=1)
    draft = Draft(
        id=1,
        user_id=1,
        page_id=999,  # Non-existent page
        content="Test post",
        status="scheduled",
        scheduled_time=past_time,
        is_active=True
    )
    test_db.add(draft)
    test_db.commit()
    
    # Process with worker
    worker = ScheduledPostingWorker(mock_mode=True)
    result = worker.process_due_drafts(test_db)
    
    # Verify draft skipped
    assert result.success is True
    assert result.processed_count == 1
    assert result.posted_count == 0
    assert result.skipped_count == 1
    
    print(f"\n✓ TEST PASS: Draft without page skipped")
    print(f"  Skipped: {result.skipped_count}")


def test_process_draft_no_token(test_db: Session):
    """Test processing draft when page has no access token"""
    # Create test data
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    
    # Create page without access token
    page = FacebookPage(
        id=1,
        user_id=1,
        page_id="test_page_123",
        page_name="Test Page",
        access_token=None,  # No token
        is_active=True
    )
    test_db.add(page)
    
    past_time = datetime.utcnow() - timedelta(hours=1)
    draft = Draft(
        id=1,
        user_id=1,
        page_id=1,
        content="Test post",
        status="scheduled",
        scheduled_time=past_time,
        is_active=True
    )
    test_db.add(draft)
    test_db.commit()
    
    # Process with worker
    worker = ScheduledPostingWorker(mock_mode=True)
    result = worker.process_due_drafts(test_db)
    
    # Verify draft skipped
    assert result.success is True
    assert result.processed_count == 1
    assert result.posted_count == 0
    assert result.skipped_count == 1
    
    print(f"\n✓ TEST PASS: Draft without token skipped")
    print(f"  Skipped: {result.skipped_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
