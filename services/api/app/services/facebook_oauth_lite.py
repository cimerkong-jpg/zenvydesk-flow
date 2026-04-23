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
    
    def get_login_url(self, *, state: str | None = None) -> str:
        """
        Generate Facebook OAuth login URL
        
        Returns:
            OAuth authorization URL
        """
        params = {
            "client_id": settings.facebook_app_id or "",
            "redirect_uri": settings.facebook_redirect_uri,
            "scope": settings.facebook_scopes,
            "response_type": "code",
        }
        if state:
            params["state"] = state
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.OAUTH_DIALOG_URL}?{query_string}"
    
    async def exchange_code_for_token_payload(self, code: str) -> Dict:
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
                return response.json()
        
        except Exception as e:
            print(f"Token exchange error: {e}")
            return {}

    async def exchange_code_for_token(self, code: str) -> Optional[str]:
        token_data = await self.exchange_code_for_token_payload(code)
        return token_data.get("access_token")

    async def fetch_user_profile(self, access_token: str) -> Dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://graph.facebook.com/v18.0/me",
                    params={
                        "fields": "id,name,email",
                        "access_token": access_token,
                    },
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"Profile fetch error: {e}")
            return {}
    
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
                    "fields": "id,name,access_token,category,tasks",
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
