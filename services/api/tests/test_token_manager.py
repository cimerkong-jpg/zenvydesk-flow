"""
Tests for Facebook Token Manager
Verifies token retrieval, validation, and safe failure behavior
"""
import pytest
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from app.services.facebook_token_manager import (
    FacebookTokenManager,
    TokenResult,
    TokenValidationResult
)
from app.models.facebook_page import FacebookPage


# ============================================================================
# Token Retrieval Tests
# ============================================================================

def test_get_page_token_success_mock():
    """Test successful token retrieval in mock mode"""
    manager = FacebookTokenManager(mock_mode=True)
    
    result = manager.get_page_token(
        db=Mock(),
        user_id=1,
        page_id="test_page_123"
    )
    
    assert result.success is True
    assert result.token == "mock_token_test_page_123_abc123"
    assert result.error_message is None
    assert result.error_code is None
    
    print(f"\n✓ TEST PASS: Mock token retrieval succeeded")
    print(f"  Token: {result.token}")


def test_get_page_token_page_not_found():
    """Test token retrieval when page doesn't exist"""
    manager = FacebookTokenManager(mock_mode=True)
    
    result = manager.get_page_token(
        db=Mock(),
        user_id=1,
        page_id="test_fail_page"
    )
    
    assert result.success is False
    assert result.token is None
    assert result.error_code == "PAGE_NOT_FOUND"
    assert "not found" in result.error_message.lower()
    
    print(f"\n✓ TEST PASS: Page not found handled safely")
    print(f"  Error: {result.error_message}")


def test_get_page_token_no_token():
    """Test token retrieval when page has no token"""
    manager = FacebookTokenManager(mock_mode=True)
    
    result = manager.get_page_token(
        db=Mock(),
        user_id=1,
        page_id="test_no_token"
    )
    
    assert result.success is False
    assert result.token is None
    assert result.error_code == "NO_TOKEN"
    assert "no access token" in result.error_message.lower()
    
    print(f"\n✓ TEST PASS: Missing token handled safely")


def test_get_page_token_invalid_page_id():
    """Test token retrieval with invalid page ID"""
    manager = FacebookTokenManager(mock_mode=True)
    
    # Empty page ID
    result = manager.get_page_token(
        db=Mock(),
        user_id=1,
        page_id=""
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_PAGE_ID"
    
    # Whitespace only
    result = manager.get_page_token(
        db=Mock(),
        user_id=1,
        page_id="   "
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_PAGE_ID"
    
    print(f"\n✓ TEST PASS: Invalid page ID handled safely")


def test_get_page_token_invalid_user_id():
    """Test token retrieval with invalid user ID"""
    manager = FacebookTokenManager(mock_mode=True)
    
    # Zero user ID
    result = manager.get_page_token(
        db=Mock(),
        user_id=0,
        page_id="test_page"
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_USER_ID"
    
    # Negative user ID
    result = manager.get_page_token(
        db=Mock(),
        user_id=-1,
        page_id="test_page"
    )
    
    assert result.success is False
    assert result.error_code == "INVALID_USER_ID"
    
    print(f"\n✓ TEST PASS: Invalid user ID handled safely")


# ============================================================================
# Token Validation Tests
# ============================================================================

@pytest.mark.asyncio
async def test_validate_token_success_mock():
    """Test successful token validation in mock mode"""
    manager = FacebookTokenManager(mock_mode=True)
    
    result = await manager.validate_token(
        page_id="test_page_123",
        access_token="valid_token"
    )
    
    assert result.valid is True
    assert result.page_id == "test_page_123"
    assert result.page_name == "Mock Page test_page_123"
    assert result.error_message is None
    
    print(f"\n✓ TEST PASS: Mock token validation succeeded")
    print(f"  Page: {result.page_name}")


@pytest.mark.asyncio
async def test_validate_token_invalid():
    """Test validation with invalid token"""
    manager = FacebookTokenManager(mock_mode=True)
    
    result = await manager.validate_token(
        page_id="test_page",
        access_token="invalid_token"
    )
    
    assert result.valid is False
    assert result.page_id is None
    assert result.page_name is None
    assert "invalid" in result.error_message.lower()
    
    print(f"\n✓ TEST PASS: Invalid token detected")


@pytest.mark.asyncio
async def test_validate_token_expired():
    """Test validation with expired token"""
    manager = FacebookTokenManager(mock_mode=True)
    
    result = await manager.validate_token(
        page_id="test_page",
        access_token="expired_token"
    )
    
    assert result.valid is False
    assert "expired" in result.error_message.lower()
    
    print(f"\n✓ TEST PASS: Expired token detected")


@pytest.mark.asyncio
async def test_validate_token_invalid_inputs():
    """Test validation with invalid inputs"""
    manager = FacebookTokenManager(mock_mode=True)
    
    # Empty page ID
    result = await manager.validate_token(
        page_id="",
        access_token="token"
    )
    assert result.valid is False
    assert "page id" in result.error_message.lower()
    
    # Empty token
    result = await manager.validate_token(
        page_id="page_123",
        access_token=""
    )
    assert result.valid is False
    assert "token" in result.error_message.lower()
    
    print(f"\n✓ TEST PASS: Invalid validation inputs handled safely")


# ============================================================================
# Get All Tokens Tests
# ============================================================================

def test_get_all_user_tokens_success():
    """Test getting all tokens for a user"""
    manager = FacebookTokenManager(mock_mode=True)
    
    tokens = manager.get_all_user_tokens(
        db=Mock(),
        user_id=1
    )
    
    assert len(tokens) == 2
    assert tokens[0]["page_id"] == "mock_page_1"
    assert tokens[0]["page_name"] == "Mock Page 1"
    assert tokens[0]["token"] == "mock_token_1"
    assert tokens[1]["page_id"] == "mock_page_2"
    
    print(f"\n✓ TEST PASS: Retrieved all user tokens")
    print(f"  Token count: {len(tokens)}")


def test_get_all_user_tokens_no_pages():
    """Test getting tokens when user has no pages"""
    manager = FacebookTokenManager(mock_mode=True)
    
    tokens = manager.get_all_user_tokens(
        db=Mock(),
        user_id=999
    )
    
    assert len(tokens) == 0
    
    print(f"\n✓ TEST PASS: No pages handled safely")


# ============================================================================
# Data Structure Tests
# ============================================================================

def test_token_result_structure():
    """Test TokenResult data structure"""
    # Success result
    success_result = TokenResult(
        success=True,
        token="test_token_123"
    )
    
    assert success_result.success is True
    assert success_result.token == "test_token_123"
    assert success_result.error_message is None
    assert success_result.error_code is None
    
    # Failure result
    failure_result = TokenResult(
        success=False,
        error_message="Test error",
        error_code="TEST_ERROR"
    )
    
    assert failure_result.success is False
    assert failure_result.token is None
    assert failure_result.error_message == "Test error"
    assert failure_result.error_code == "TEST_ERROR"
    
    print(f"\n✓ TEST PASS: TokenResult structure verified")


def test_token_validation_result_structure():
    """Test TokenValidationResult data structure"""
    # Valid result
    valid_result = TokenValidationResult(
        valid=True,
        page_id="123",
        page_name="Test Page"
    )
    
    assert valid_result.valid is True
    assert valid_result.page_id == "123"
    assert valid_result.page_name == "Test Page"
    assert valid_result.error_message is None
    
    # Invalid result
    invalid_result = TokenValidationResult(
        valid=False,
        error_message="Validation failed"
    )
    
    assert invalid_result.valid is False
    assert invalid_result.page_id is None
    assert invalid_result.page_name is None
    assert invalid_result.error_message == "Validation failed"
    
    print(f"\n✓ TEST PASS: TokenValidationResult structure verified")


# ============================================================================
# Integration with Posting Workflow Tests
# ============================================================================

def test_token_manager_integration_with_poster():
    """Test token manager provides tokens for posting workflow"""
    manager = FacebookTokenManager(mock_mode=True)
    
    # Get token for posting
    token_result = manager.get_page_token(
        db=Mock(),
        user_id=1,
        page_id="test_page_123"
    )
    
    # Verify token can be used for posting
    assert token_result.success is True
    assert token_result.token is not None
    assert len(token_result.token) > 0
    
    # Simulate passing token to FacebookPoster
    page_access_token = token_result.token
    assert page_access_token == "mock_token_test_page_123_abc123"
    
    print(f"\n✓ TEST PASS: Token manager integrates with posting workflow")
    print(f"  Token ready for FacebookPoster: {page_access_token}")


def test_token_manager_safe_failure_for_posting():
    """Test token manager fails safely when token unavailable"""
    manager = FacebookTokenManager(mock_mode=True)
    
    # Try to get token for page without token
    token_result = manager.get_page_token(
        db=Mock(),
        user_id=1,
        page_id="test_no_token"
    )
    
    # Verify safe failure
    assert token_result.success is False
    assert token_result.token is None
    assert token_result.error_code == "NO_TOKEN"
    
    # Posting workflow can check and handle gracefully
    if not token_result.success:
        error_message = token_result.error_message
        error_code = token_result.error_code
        assert error_message is not None
        assert error_code is not None
    
    print(f"\n✓ TEST PASS: Safe failure prevents posting with invalid token")
    print(f"  Error code: {token_result.error_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
