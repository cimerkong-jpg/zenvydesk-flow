"""
Facebook Token Manager - First OAuth Slice
Handles Facebook page access token retrieval and validation
Safe failure behavior with structured error handling
"""
from typing import Optional, Dict, List
from dataclasses import dataclass
import httpx
from sqlalchemy.orm import Session

from app.models.facebook_page import FacebookPage


@dataclass
class TokenResult:
    """Result of token operation with success/failure state"""
    success: bool
    token: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None


@dataclass
class TokenValidationResult:
    """Result of token validation"""
    valid: bool
    page_id: Optional[str] = None
    page_name: Optional[str] = None
    error_message: Optional[str] = None


class FacebookTokenManager:
    """
    Manages Facebook page access tokens
    First slice: token retrieval and validation boundary
    """
    
    def __init__(self, mock_mode: bool = False):
        """
        Initialize token manager
        
        Args:
            mock_mode: If True, use mock responses for testing
        """
        self.mock_mode = mock_mode
        self.api_base_url = "https://graph.facebook.com/v18.0"
    
    def get_page_token(
        self,
        db: Session,
        user_id: int,
        page_id: str
    ) -> TokenResult:
        """
        Get page access token for a specific page
        
        Args:
            db: Database session
            user_id: User ID who owns the page
            page_id: Facebook page ID
        
        Returns:
            TokenResult with token or error details
        """
        # Validate inputs
        if not page_id or not page_id.strip():
            return TokenResult(
                success=False,
                error_message="Page ID is required",
                error_code="INVALID_PAGE_ID"
            )
        
        if user_id <= 0:
            return TokenResult(
                success=False,
                error_message="Invalid user ID",
                error_code="INVALID_USER_ID"
            )
        
        # Mock mode for testing
        if self.mock_mode:
            return self._mock_get_token(page_id)
        
        # Real database lookup
        return self._real_get_token(db, user_id, page_id)
    
    def _mock_get_token(self, page_id: str) -> TokenResult:
        """Mock token retrieval for testing"""
        # Simulate failure scenarios
        if page_id == "test_fail_page":
            return TokenResult(
                success=False,
                error_message="Page not found",
                error_code="PAGE_NOT_FOUND"
            )
        
        if page_id == "test_no_token":
            return TokenResult(
                success=False,
                error_message="No access token available",
                error_code="NO_TOKEN"
            )
        
        # Success case
        mock_token = f"mock_token_{page_id}_abc123"
        return TokenResult(
            success=True,
            token=mock_token
        )
    
    def _real_get_token(
        self,
        db: Session,
        user_id: int,
        page_id: str
    ) -> TokenResult:
        """Real token retrieval from database"""
        try:
            # Query for the page
            page = db.query(FacebookPage).filter(
                FacebookPage.user_id == user_id,
                FacebookPage.page_id == page_id,
                FacebookPage.is_active == True
            ).first()
            
            if not page:
                return TokenResult(
                    success=False,
                    error_message=f"Page {page_id} not found for user",
                    error_code="PAGE_NOT_FOUND"
                )
            
            if not page.access_token:
                return TokenResult(
                    success=False,
                    error_message="No access token available for page",
                    error_code="NO_TOKEN"
                )
            
            return TokenResult(
                success=True,
                token=page.access_token
            )
        
        except Exception as e:
            return TokenResult(
                success=False,
                error_message=f"Database error: {str(e)}",
                error_code="DATABASE_ERROR"
            )
    
    async def validate_token(
        self,
        page_id: str,
        access_token: str
    ) -> TokenValidationResult:
        """
        Validate a page access token by calling Facebook API
        
        Args:
            page_id: Facebook page ID
            access_token: Page access token to validate
        
        Returns:
            TokenValidationResult with validation status
        """
        # Validate inputs
        if not page_id or not page_id.strip():
            return TokenValidationResult(
                valid=False,
                error_message="Page ID is required"
            )
        
        if not access_token or not access_token.strip():
            return TokenValidationResult(
                valid=False,
                error_message="Access token is required"
            )
        
        # Mock mode for testing
        if self.mock_mode:
            return self._mock_validate_token(page_id, access_token)
        
        # Real Facebook API validation
        return await self._real_validate_token(page_id, access_token)
    
    def _mock_validate_token(
        self,
        page_id: str,
        access_token: str
    ) -> TokenValidationResult:
        """Mock token validation for testing"""
        # Simulate invalid token
        if access_token == "invalid_token":
            return TokenValidationResult(
                valid=False,
                error_message="Invalid access token"
            )
        
        # Simulate expired token
        if access_token == "expired_token":
            return TokenValidationResult(
                valid=False,
                error_message="Token has expired"
            )
        
        # Success case
        return TokenValidationResult(
            valid=True,
            page_id=page_id,
            page_name=f"Mock Page {page_id}"
        )
    
    async def _real_validate_token(
        self,
        page_id: str,
        access_token: str
    ) -> TokenValidationResult:
        """Real token validation via Facebook API"""
        url = f"{self.api_base_url}/{page_id}"
        params = {
            "fields": "id,name",
            "access_token": access_token
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    return TokenValidationResult(
                        valid=True,
                        page_id=data.get("id"),
                        page_name=data.get("name")
                    )
                else:
                    # Handle error response
                    try:
                        error_data = response.json()
                        error_message = error_data.get("error", {}).get("message", "Unknown error")
                    except:
                        error_message = f"HTTP {response.status_code}"
                    
                    return TokenValidationResult(
                        valid=False,
                        error_message=error_message
                    )
        
        except httpx.TimeoutException:
            return TokenValidationResult(
                valid=False,
                error_message="Request timeout"
            )
        except httpx.ConnectError:
            return TokenValidationResult(
                valid=False,
                error_message="Connection error"
            )
        except Exception as e:
            return TokenValidationResult(
                valid=False,
                error_message=f"Unexpected error: {str(e)}"
            )
    
    def get_all_user_tokens(
        self,
        db: Session,
        user_id: int
    ) -> List[Dict[str, str]]:
        """
        Get all page tokens for a user
        
        Args:
            db: Database session
            user_id: User ID
        
        Returns:
            List of dicts with page_id, page_name, and token
        """
        if self.mock_mode:
            return self._mock_get_all_tokens(user_id)
        
        return self._real_get_all_tokens(db, user_id)
    
    def _mock_get_all_tokens(self, user_id: int) -> List[Dict[str, str]]:
        """Mock get all tokens for testing"""
        if user_id == 999:
            return []  # No pages
        
        return [
            {
                "page_id": "mock_page_1",
                "page_name": "Mock Page 1",
                "token": "mock_token_1"
            },
            {
                "page_id": "mock_page_2",
                "page_name": "Mock Page 2",
                "token": "mock_token_2"
            }
        ]
    
    def _real_get_all_tokens(
        self,
        db: Session,
        user_id: int
    ) -> List[Dict[str, str]]:
        """Real get all tokens from database"""
        try:
            pages = db.query(FacebookPage).filter(
                FacebookPage.user_id == user_id,
                FacebookPage.is_active == True
            ).all()
            
            return [
                {
                    "page_id": page.page_id,
                    "page_name": page.page_name,
                    "token": page.access_token
                }
                for page in pages
                if page.access_token
            ]
        
        except Exception:
            return []
