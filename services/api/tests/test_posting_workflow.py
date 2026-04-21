"""
Tests for posting workflow integration
Verifies Draft → FacebookPoster → PostHistory flow with safe failure handling
"""
import pytest
from app.models.user import User
from app.models.facebook_page import FacebookPage
from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.services.posting_service import PostingService


def test_posting_workflow_success(test_db):
    """Test successful posting workflow from draft to Facebook"""
    # Create test user
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()
    
    # Create Facebook page
    page = FacebookPage(
        user_id=user.id,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token"
    )
    test_db.add(page)
    test_db.commit()
    
    # Create draft
    draft = Draft(
        user_id=user.id,
        page_id=page.id,
        content="Test post content",
        status="draft"
    )
    test_db.add(draft)
    test_db.commit()
    
    # Post using posting service (mock mode)
    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id
    )
    
    # Verify success
    assert success is True
    assert post_history is not None
    assert error is None
    
    # Verify PostHistory created correctly
    assert post_history.user_id == user.id
    assert post_history.page_id == page.id
    assert post_history.draft_id == draft.id
    assert post_history.content == "Test post content"
    assert post_history.post_status == "posted"
    assert post_history.error_message is None
    
    # Verify draft status updated
    test_db.refresh(draft)
    assert draft.status == "posted"
    
    # Verify PostHistory persisted in DB
    saved_post = test_db.query(PostHistory).filter(
        PostHistory.id == post_history.id
    ).first()
    assert saved_post is not None
    assert saved_post.post_status == "posted"
    
    print(f"\n✓ TEST PASS: Posting workflow success")
    print(f"  Draft ID: {draft.id}")
    print(f"  PostHistory ID: {post_history.id}")
    print(f"  Draft status: {draft.status}")


def test_posting_workflow_facebook_failure(test_db):
    """Test posting workflow handles Facebook API failure safely"""
    # Create test user
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()
    
    # Create Facebook page with page_id that triggers mock failure
    page = FacebookPage(
        user_id=user.id,
        page_id="test_fail_page",  # This triggers mock failure
        page_name="Test Page",
        access_token="test_token"
    )
    test_db.add(page)
    test_db.commit()
    
    # Create draft
    draft = Draft(
        user_id=user.id,
        page_id=page.id,
        content="Test post content",
        status="draft"
    )
    test_db.add(draft)
    test_db.commit()
    
    # Count PostHistory before
    posts_before = test_db.query(PostHistory).count()
    
    # Post using posting service (mock mode)
    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id
    )
    
    # Verify failure
    assert success is False
    assert post_history is None
    assert error is not None
    assert "Mock API error" in error
    
    # Verify NO PostHistory created (safe failure)
    posts_after = test_db.query(PostHistory).count()
    assert posts_after == posts_before
    
    # Verify draft status updated to indicate failure
    test_db.refresh(draft)
    assert draft.status == "post_failed"
    
    print(f"\n✓ TEST PASS: Posting workflow handles Facebook failure safely")
    print(f"  Draft ID: {draft.id}")
    print(f"  Draft status: {draft.status}")
    print(f"  Error: {error}")
    print(f"  PostHistory created: No (safe failure)")


def test_posting_workflow_draft_not_found(test_db):
    """Test posting workflow handles missing draft"""
    # Create test user
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()
    
    # Try to post non-existent draft
    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=999,
        user_id=user.id
    )
    
    # Verify failure
    assert success is False
    assert post_history is None
    assert error is not None
    assert "not found" in error
    
    print(f"\n✓ TEST PASS: Posting workflow handles missing draft")
    print(f"  Error: {error}")


def test_posting_workflow_page_not_found(test_db):
    """Test posting workflow handles missing Facebook page"""
    # Create test user
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()
    
    # Create draft with non-existent page_id
    draft = Draft(
        user_id=user.id,
        page_id=999,  # Non-existent page
        content="Test post content",
        status="draft"
    )
    test_db.add(draft)
    test_db.commit()
    
    # Try to post
    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id
    )
    
    # Verify failure
    assert success is False
    assert post_history is None
    assert error is not None
    assert "page" in error.lower() and "not found" in error
    
    print(f"\n✓ TEST PASS: Posting workflow handles missing page")
    print(f"  Error: {error}")


def test_posting_workflow_missing_access_token(test_db):
    """Test posting workflow handles missing access token"""
    # Create test user
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()
    
    # Create Facebook page WITHOUT access token
    page = FacebookPage(
        user_id=user.id,
        page_id="test_page_123",
        page_name="Test Page",
        access_token=None  # No token
    )
    test_db.add(page)
    test_db.commit()
    
    # Create draft
    draft = Draft(
        user_id=user.id,
        page_id=page.id,
        content="Test post content",
        status="draft"
    )
    test_db.add(draft)
    test_db.commit()
    
    # Try to post
    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id
    )
    
    # Verify failure
    assert success is False
    assert post_history is None
    assert error is not None
    assert "access token" in error.lower()
    
    print(f"\n✓ TEST PASS: Posting workflow handles missing access token")
    print(f"  Error: {error}")


def test_posting_workflow_with_media_url(test_db):
    """Test posting workflow with media URL (link)"""
    # Create test user
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()
    
    # Create Facebook page
    page = FacebookPage(
        user_id=user.id,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token"
    )
    test_db.add(page)
    test_db.commit()
    
    # Create draft with media URL
    draft = Draft(
        user_id=user.id,
        page_id=page.id,
        content="Check out this link!",
        media_url="https://example.com",
        status="draft"
    )
    test_db.add(draft)
    test_db.commit()
    
    # Post using posting service (mock mode)
    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id
    )
    
    # Verify success
    assert success is True
    assert post_history is not None
    assert post_history.media_url == "https://example.com"
    
    print(f"\n✓ TEST PASS: Posting workflow with media URL")
    print(f"  Media URL: {post_history.media_url}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
