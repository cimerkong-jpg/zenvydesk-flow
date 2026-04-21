"""
Facebook OAuth Lite Routes
Minimal implementation for login and callback
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
from urllib.parse import urlencode

from app.core.database import get_db
from app.services.facebook_oauth_lite import FacebookOAuthLite
from app.models.user import User
from app.models.facebook_page import FacebookPage
from app.core.config import settings


def _frontend_redirect(**params: str) -> RedirectResponse:
    base = settings.frontend_base_url.rstrip("/")
    query = urlencode({k: v for k, v in params.items() if v is not None})
    return RedirectResponse(url=f"{base}/?{query}")


router = APIRouter(prefix="/api/v1/auth/facebook", tags=["auth"])


@router.get("/login")
async def facebook_login():
    """
    Initiate Facebook OAuth login
    Redirects user to Facebook OAuth dialog
    """
    if not settings.facebook_app_id or not settings.facebook_redirect_uri:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Facebook OAuth config is missing"}
        )

    oauth = FacebookOAuthLite()
    login_url = oauth.get_login_url()
    
    return RedirectResponse(url=login_url)


@router.get("/callback")
async def facebook_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle Facebook OAuth callback
    Exchange code for token, fetch pages, save first page to DB
    
    Returns:
        JSON response with success status and pages_saved count
    """
    # Handle OAuth error
    if error:
        return _frontend_redirect(fb_error=error)

    if not code:
        return _frontend_redirect(fb_error="missing_code")

    try:
        oauth = FacebookOAuthLite()

        # Exchange code for access token
        access_token = await oauth.exchange_code_for_token(code)

        if not access_token:
            return _frontend_redirect(fb_error="token_exchange_failed")

        # Fetch user's pages
        pages = await oauth.fetch_managed_pages(access_token)

        if not pages:
            return _frontend_redirect(fb_connected="1", pages_saved="0")
        
        # Get or create default user (user_id = 1)
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(id=1, email="default@zenvydesk.com", name="Default User")
            db.add(user)
            db.commit()
        
        # Save first page to database
        first_page = pages[0]
        page_id = first_page.get("id")
        page_name = first_page.get("name")
        page_access_token = first_page.get("access_token")
        
        # Check if page already exists
        existing_page = db.query(FacebookPage).filter(
            FacebookPage.page_id == page_id
        ).first()
        
        if existing_page:
            # Update existing page
            existing_page.page_name = page_name
            existing_page.access_token = page_access_token
            existing_page.is_active = True
        else:
            # Create new page
            new_page = FacebookPage(
                user_id=1,
                page_id=page_id,
                page_name=page_name,
                access_token=page_access_token,
                is_active=True
            )
            db.add(new_page)
        
        db.commit()

        return _frontend_redirect(fb_connected="1", pages_saved="1")

    except Exception as e:
        return _frontend_redirect(fb_error=str(e))
