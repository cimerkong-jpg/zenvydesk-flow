"""
Tests for Facebook posting service
Verifies posting boundary with safe request/response handling
"""
import pytest
from app.services.facebook_poster import FacebookPoster, FacebookPostResult


def test_facebook_poster_mock_success():
    """Test successful Facebook posting in mock mode"""
    poster = FacebookPoster(mock_mode=True)
    
    result = poster.post_to_page(
        page_id="test_page_123",
        access_token="test_token",
        message="Test post content"
    )
    
    assert result.success is True
    assert result.post_id == "test_page_123_mock_post_123"
    assert result.error_message is None
    assert result.error_code is None
    
    print(f"\n✓ TEST PASS: Mock Facebook posting succeeded")
    print(f"  Post ID: {result.post_id}")


def test_facebook_poster_mock_failure():
    """Test failed Facebook posting in mock mode"""
    poster = FacebookPoster(mock_mode=True)
    
    result = poster.post_to_page(
        page_id="test_fail_page",
        access_token="test_token",
        message="Test post content"
    )
    
    assert result.success is False
    assert result.post_id is None
    assert result.error_message == "Mock API error: Invalid page"
    assert result.error_code == "MOCK_ERROR"
    
    print(f"\n✓ TEST PASS: Mock Facebook posting failure handled")
    print(f"  Error: {result.error_message}")


def test_facebook_poster_invalid_page_id():
    """Test posting with invalid page ID"""
    poster = FacebookPoster(mock_mode=True)
    
    # Empty page ID
    result = poster.post_to_page(
        page_id="",
        access_token="test_token",
        message="Test content"
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_PAGE_ID"
    assert "Page ID is required" in result.error_message
    
    # Whitespace only
    result = poster.post_to_page(
        page_id="   ",
        access_token="test_token",
        message="Test content"
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_PAGE_ID"
    
    print(f"\n✓ TEST PASS: Invalid page ID handled safely")


def test_facebook_poster_invalid_access_token():
    """Test posting with invalid access token"""
    poster = FacebookPoster(mock_mode=True)
    
    # Empty token
    result = poster.post_to_page(
        page_id="test_page",
        access_token="",
        message="Test content"
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_ACCESS_TOKEN"
    assert "Access token is required" in result.error_message
    
    # Whitespace only
    result = poster.post_to_page(
        page_id="test_page",
        access_token="   ",
        message="Test content"
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_ACCESS_TOKEN"
    
    print(f"\n✓ TEST PASS: Invalid access token handled safely")


def test_facebook_poster_invalid_message():
    """Test posting with invalid message"""
    poster = FacebookPoster(mock_mode=True)
    
    # Empty message
    result = poster.post_to_page(
        page_id="test_page",
        access_token="test_token",
        message=""
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_MESSAGE"
    assert "Message content is required" in result.error_message
    
    # Whitespace only
    result = poster.post_to_page(
        page_id="test_page",
        access_token="test_token",
        message="   "
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_MESSAGE"
    
    print(f"\n✓ TEST PASS: Invalid message handled safely")


def test_facebook_poster_with_link():
    """Test posting with optional link"""
    poster = FacebookPoster(mock_mode=True)
    
    result = poster.post_to_page(
        page_id="test_page",
        access_token="test_token",
        message="Check out this link!",
        link="https://example.com"
    )
    
    assert result.success is True
    assert result.post_id is not None
    
    print(f"\n✓ TEST PASS: Posting with link succeeded")
    print(f"  Post ID: {result.post_id}")


def test_facebook_post_result_structure():
    """Test FacebookPostResult data structure"""
    # Success result
    success_result = FacebookPostResult(
        success=True,
        post_id="123_456"
    )
    
    assert success_result.success is True
    assert success_result.post_id == "123_456"
    assert success_result.error_message is None
    assert success_result.error_code is None
    
    # Failure result
    failure_result = FacebookPostResult(
        success=False,
        error_message="Test error",
        error_code="TEST_ERROR"
    )
    
    assert failure_result.success is False
    assert failure_result.post_id is None
    assert failure_result.error_message == "Test error"
    assert failure_result.error_code == "TEST_ERROR"
    
    print(f"\n✓ TEST PASS: FacebookPostResult structure verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
