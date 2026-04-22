"""
Tests for posting workflow integration.
Verifies Draft -> FacebookPoster -> PostHistory flow with safe failure handling.
"""
import pytest

from app.models.draft import Draft
from app.models.facebook_page import FacebookPage
from app.models.post_history import PostHistory
from app.models.user import User
from app.services.posting_service import PostingService


def test_posting_workflow_success(test_db):
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()

    page = FacebookPage(
        user_id=user.id,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token",
    )
    test_db.add(page)
    test_db.commit()

    draft = Draft(
        user_id=user.id,
        page_id=page.id,
        content="Test post content",
        status="draft",
    )
    test_db.add(draft)
    test_db.commit()

    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id,
    )

    assert success is True
    assert post_history is not None
    assert error is None
    assert post_history.user_id == user.id
    assert post_history.page_id == page.id
    assert post_history.draft_id == draft.id
    assert post_history.content == "Test post content"
    assert post_history.post_status == "success"
    assert post_history.error_message is None

    test_db.refresh(draft)
    assert draft.status == "posted"

    saved_post = test_db.query(PostHistory).filter(PostHistory.id == post_history.id).first()
    assert saved_post is not None
    assert saved_post.post_status == "success"


def test_posting_workflow_facebook_failure(test_db):
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()

    page = FacebookPage(
        user_id=user.id,
        page_id="test_fail_page",
        page_name="Test Page",
        access_token="test_token",
    )
    test_db.add(page)
    test_db.commit()

    draft = Draft(
        user_id=user.id,
        page_id=page.id,
        content="Test post content",
        status="draft",
    )
    test_db.add(draft)
    test_db.commit()

    posts_before = test_db.query(PostHistory).count()

    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id,
    )

    assert success is False
    assert post_history is None
    assert error is not None
    assert "Mock API error" in error

    posts_after = test_db.query(PostHistory).count()
    assert posts_after == posts_before

    test_db.refresh(draft)
    assert draft.status == "post_failed"


def test_posting_workflow_draft_not_found(test_db):
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()

    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=999,
        user_id=user.id,
    )

    assert success is False
    assert post_history is None
    assert error is not None
    assert "not found" in error


def test_posting_workflow_page_not_found(test_db):
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()

    draft = Draft(
        user_id=user.id,
        page_id=999,
        content="Test post content",
        status="draft",
    )
    test_db.add(draft)
    test_db.commit()

    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id,
    )

    assert success is False
    assert post_history is None
    assert error is not None
    assert "page" in error.lower() and "not found" in error


def test_posting_workflow_missing_access_token(test_db):
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()

    page = FacebookPage(
        user_id=user.id,
        page_id="test_page_123",
        page_name="Test Page",
        access_token=None,
    )
    test_db.add(page)
    test_db.commit()

    draft = Draft(
        user_id=user.id,
        page_id=page.id,
        content="Test post content",
        status="draft",
    )
    test_db.add(draft)
    test_db.commit()

    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id,
    )

    assert success is False
    assert post_history is None
    assert error is not None
    assert "access token" in error.lower()


def test_posting_workflow_with_media_url(test_db):
    user = User(email="test@example.com")
    test_db.add(user)
    test_db.commit()

    page = FacebookPage(
        user_id=user.id,
        page_id="test_page_123",
        page_name="Test Page",
        access_token="test_token",
    )
    test_db.add(page)
    test_db.commit()

    draft = Draft(
        user_id=user.id,
        page_id=page.id,
        content="Check out this link!",
        media_url="https://example.com",
        status="draft",
    )
    test_db.add(draft)
    test_db.commit()

    posting_service = PostingService(test_db, mock_mode=True)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=user.id,
    )

    assert success is True
    assert post_history is not None
    assert error is None
    assert post_history.media_url == "https://example.com"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
