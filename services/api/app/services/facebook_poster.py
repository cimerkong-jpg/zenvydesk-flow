"""
Facebook posting service
Handles posting content to Facebook pages with safe request/response handling
"""
from typing import Optional
from dataclasses import dataclass
import requests


@dataclass
class FacebookPostResult:
    """Result of a Facebook posting operation"""
    success: bool
    post_id: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None


class FacebookPoster:
    """
    Service for posting content to Facebook pages
    Handles API boundary with structured success/failure results
    """
    
    def __init__(self, mock_mode: bool = False):
        """
        Initialize Facebook poster
        
        Args:
            mock_mode: If True, use mock responses instead of real API calls
        """
        self.mock_mode = mock_mode
        self.api_base_url = "https://graph.facebook.com/v18.0"
    
    def post_to_page(
        self,
        page_id: str,
        access_token: str,
        message: str,
        link: Optional[str] = None
    ) -> FacebookPostResult:
        """
        Post content to a Facebook page
        
        Args:
            page_id: Facebook page ID
            access_token: Page access token
            message: Post message/content
            link: Optional link to include in post
        
        Returns:
            FacebookPostResult with success status and post ID or error details
        """
        # Validate inputs
        if not page_id or not page_id.strip():
            return FacebookPostResult(
                success=False,
                error_message="Page ID is required",
                error_code="INVALID_PAGE_ID"
            )
        
        if not access_token or not access_token.strip():
            return FacebookPostResult(
                success=False,
                error_message="Access token is required",
                error_code="INVALID_ACCESS_TOKEN"
            )
        
        if not message or not message.strip():
            return FacebookPostResult(
                success=False,
                error_message="Message content is required",
                error_code="INVALID_MESSAGE"
            )
        
        # Mock mode for testing
        if self.mock_mode:
            return self._mock_post(page_id, message)
        
        # Real Facebook API call
        return self._real_post(page_id, access_token, message, link)
    
    def _mock_post(self, page_id: str, message: str) -> FacebookPostResult:
        """
        Mock Facebook posting for testing
        Returns success with fake post ID
        """
        # Simulate different scenarios based on page_id
        if page_id == "test_fail_page":
            return FacebookPostResult(
                success=False,
                error_message="Mock API error: Invalid page",
                error_code="MOCK_ERROR"
            )
        
        # Success case
        mock_post_id = f"{page_id}_mock_post_123"
        return FacebookPostResult(
            success=True,
            post_id=mock_post_id
        )
    
    def _real_post(
        self,
        page_id: str,
        access_token: str,
        message: str,
        link: Optional[str]
    ) -> FacebookPostResult:
        """
        Real Facebook API posting
        Handles request/response with proper error handling
        """
        url = f"{self.api_base_url}/{page_id}/feed"
        
        # Prepare request data
        data = {
            "message": message,
            "access_token": access_token
        }
        
        if link:
            data["link"] = link
        
        try:
            # Make API request
            response = requests.post(url, data=data, timeout=10)
            
            # Handle response
            if response.status_code == 200:
                result_data = response.json()
                post_id = result_data.get("id")
                
                if post_id:
                    return FacebookPostResult(
                        success=True,
                        post_id=post_id
                    )
                else:
                    return FacebookPostResult(
                        success=False,
                        error_message="No post ID in response",
                        error_code="MISSING_POST_ID"
                    )
            else:
                # Handle error response
                try:
                    error_data = response.json()
                    error_message = error_data.get("error", {}).get("message", "Unknown error")
                    error_code = error_data.get("error", {}).get("code", "UNKNOWN")
                except:
                    error_message = f"HTTP {response.status_code}: {response.text[:100]}"
                    error_code = f"HTTP_{response.status_code}"
                
                return FacebookPostResult(
                    success=False,
                    error_message=error_message,
                    error_code=str(error_code)
                )
        
        except requests.exceptions.Timeout:
            return FacebookPostResult(
                success=False,
                error_message="Request timeout",
                error_code="TIMEOUT"
            )
        except requests.exceptions.ConnectionError:
            return FacebookPostResult(
                success=False,
                error_message="Connection error",
                error_code="CONNECTION_ERROR"
            )
        except Exception as e:
            return FacebookPostResult(
                success=False,
                error_message=f"Unexpected error: {str(e)}",
                error_code="UNEXPECTED_ERROR"
            )
