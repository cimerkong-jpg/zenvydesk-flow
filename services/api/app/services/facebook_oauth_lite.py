"""
Facebook OAuth Lite Service
Minimal implementation for token exchange and page fetching
Adapted from ZenvyProject
"""
import httpx
from typing import Dict, Optional, List

from app.core.config import settings


class FacebookOAuthLite:
    """Minimal OAuth service for Facebook integration"""
    
    OAUTH_DIALOG_URL = "https://www.facebook.com/v18.0/dialog/oauth"
    TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
    PAGES_URL = "https://graph.facebook.com/v18.0/me/accounts"
    
    def get_login_url(self) -> str:
        """
        Generate Facebook OAuth login URL
        
        Returns:
            OAuth authorization URL
        """
        params = {
            "client_id": settings.facebook_app_id or "",
            "redirect_uri": settings.facebook_redirect_uri,
            "scope": settings.facebook_scopes,
            "response_type": "code"
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.OAUTH_DIALOG_URL}?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> Optional[str]:
        """
        Exchange authorization code for access token
        Adapted from ZenvyProject FacebookOAuthService
        
        Args:
            code: Authorization code from Facebook
        
        Returns:
            Access token string or None if failed
        """
        params = {
            "client_id": settings.facebook_app_id or "",
            "client_secret": settings.facebook_app_secret or "",
            "redirect_uri": settings.facebook_redirect_uri,
            "code": code
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.TOKEN_URL, params=params)
                response.raise_for_status()
                token_data = response.json()
                
                return token_data.get("access_token")
        
        except Exception as e:
            print(f"Token exchange error: {e}")
            return None
    
    async def fetch_managed_pages(self, access_token: str) -> List[Dict]:
        """
        Fetch user's Facebook pages
        Adapted from ZenvyProject FacebookOAuthService.fetch_managed_pages
        
        Args:
            access_token: User access token
        
        Returns:
            List of page dicts with id, name, access_token
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = self.PAGES_URL
                params = {
                    "fields": "id,name,access_token",
                    "access_token": access_token
                }
                all_pages: List[Dict] = []

                while url:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    pages_data = response.json()
                    all_pages.extend(pages_data.get("data", []))

                    paging = pages_data.get("paging", {})
                    url = paging.get("next")
                    params = None

                return all_pages
        
        except Exception as e:
            print(f"Page fetch error: {e}")
            return []
