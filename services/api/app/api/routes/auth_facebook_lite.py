"""
Facebook OAuth Lite Routes
Minimal implementation for login and callback
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from urllib.parse import urlencode

from app.core.database import get_db
from app.services.facebook_oauth_lite import FacebookOAuthLite
from app.models.user import User
from app.models.facebook_page import FacebookPage
from app.core.config import settings


def _frontend_redirect(**params: str) -> RedirectResponse:
    base = settings.resolved_frontend_base_url.rstrip("/")
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
        return _frontend_redirect(fb_error="missing_oauth_config")

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
    Handle Facebook OAuth callback and save all returned managed pages.
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
        
        saved_page_ids = set()
        selected_page = (
            db.query(FacebookPage)
            .filter(FacebookPage.user_id == 1, FacebookPage.is_selected.is_(True))
            .first()
        )

        for page in pages:
            page_id = page.get("id")
            if not page_id:
                continue

            saved_page_ids.add(page_id)
            existing_page = db.query(FacebookPage).filter(
                FacebookPage.page_id == page_id
            ).first()

            if existing_page:
                existing_page.page_name = page.get("name") or existing_page.page_name
                existing_page.access_token = page.get("access_token")
                existing_page.is_active = True
            else:
                existing_page = FacebookPage(
                    user_id=1,
                    page_id=page_id,
                    page_name=page.get("name") or page_id,
                    access_token=page.get("access_token"),
                    is_active=True,
                    is_selected=False,
                )
                db.add(existing_page)

        db.flush()

        existing_pages = db.query(FacebookPage).filter(FacebookPage.user_id == 1).all()
        for existing_page in existing_pages:
            if existing_page.page_id not in saved_page_ids:
                existing_page.is_active = False
                existing_page.is_selected = False

        active_pages = [
            page for page in existing_pages if page.page_id in saved_page_ids
        ]
        keep_selected = selected_page and selected_page.page_id in saved_page_ids
        for page in active_pages:
            page.is_selected = keep_selected and page.page_id == selected_page.page_id

        if active_pages and not any(page.is_selected for page in active_pages):
            active_pages[0].is_selected = True

        db.commit()

        return _frontend_redirect(fb_connected="1", pages_saved=str(len(saved_page_ids)))

    except Exception as e:
        return _frontend_redirect(fb_error=str(e))
