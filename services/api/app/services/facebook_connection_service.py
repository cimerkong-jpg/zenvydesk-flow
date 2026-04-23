from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.facebook_page import FacebookPage
from app.models.oauth_connection_session import OAuthConnectionSession
from app.models.oauth_identity import OAuthIdentity
from app.models.user import User
from app.services.facebook_oauth_lite import FacebookOAuthLite


def _utcnow() -> datetime:
    return datetime.now()


class FacebookConnectionService:
    def __init__(self, db: Session):
        self.db = db
        self.oauth = FacebookOAuthLite()

    @staticmethod
    def _demo_page_id(user: User) -> str:
        return f"demo-page-{user.id}"

    def _ensure_demo_page(self, user: User) -> FacebookPage:
        demo_page = (
            self.db.query(FacebookPage)
            .filter(FacebookPage.user_id == user.id, FacebookPage.page_id == self._demo_page_id(user))
            .first()
        )
        if not demo_page:
            demo_page = FacebookPage(
                user_id=user.id,
                page_id=self._demo_page_id(user),
                page_name="Demo Page",
                category="demo",
                tasks="DEMO_TEST",
                is_active=True,
                is_selected=True,
            )
            self.db.add(demo_page)
            self.db.commit()
            self.db.refresh(demo_page)
            return demo_page

        if not demo_page.is_active or not demo_page.is_selected:
            self.db.query(FacebookPage).filter(FacebookPage.user_id == user.id).update({FacebookPage.is_selected: False})
            demo_page.is_active = True
            demo_page.is_selected = True
            self.db.commit()
            self.db.refresh(demo_page)
        return demo_page

    def start_connection(self, user: User) -> dict[str, str]:
        if not settings.facebook_app_id or not settings.facebook_redirect_uri:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Facebook OAuth is not configured")

        state = secrets.token_urlsafe(24)
        session = OAuthConnectionSession(
            user_id=user.id,
            provider="facebook",
            state=state,
            redirect_uri=settings.facebook_redirect_uri,
            expires_at=_utcnow() + timedelta(minutes=settings.oauth_state_expiry_minutes),
        )
        self.db.add(session)
        self.db.commit()

        authorization_url = self.oauth.get_login_url(state=state)
        return {"authorization_url": authorization_url, "state": state}

    async def handle_callback(self, state: str | None, code: str | None, error: str | None) -> tuple[User, int]:
        if error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
        if not state or not code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth state or code")

        session = (
            self.db.query(OAuthConnectionSession)
            .filter(
                OAuthConnectionSession.provider == "facebook",
                OAuthConnectionSession.state == state,
                OAuthConnectionSession.completed_at.is_(None),
            )
            .first()
        )
        if not session or session.expires_at < _utcnow():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth session expired")

        user = self.db.query(User).filter(User.id == session.user_id, User.deleted_at.is_(None)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth session user not found")

        token_data = await self.oauth.exchange_code_for_token_payload(code)
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Facebook token exchange failed")

        profile = await self.oauth.fetch_user_profile(access_token)
        provider_user_id = profile.get("id")
        pages = await self.oauth.fetch_managed_pages(access_token)

        identity = (
            self.db.query(OAuthIdentity)
            .filter(OAuthIdentity.provider == "facebook", OAuthIdentity.user_id == user.id)
            .first()
        )
        if not identity:
            identity = OAuthIdentity(
                user_id=user.id,
                provider="facebook",
                provider_user_id=provider_user_id or "",
            )
            self.db.add(identity)

        identity.provider_user_id = provider_user_id or identity.provider_user_id
        identity.provider_email = profile.get("email")
        identity.access_token = access_token
        identity.token_type = token_data.get("token_type", "bearer")
        if token_data.get("expires_in"):
            identity.expires_at = _utcnow() + timedelta(seconds=int(token_data["expires_in"]))

        saved_page_ids: set[str] = set()
        selected_page = (
            self.db.query(FacebookPage)
            .filter(FacebookPage.user_id == user.id, FacebookPage.is_selected.is_(True))
            .first()
        )
        for page in pages:
            page_id = page.get("id")
            if not page_id:
                continue
            saved_page_ids.add(page_id)
            existing = (
                self.db.query(FacebookPage)
                .filter(FacebookPage.user_id == user.id, FacebookPage.page_id == page_id)
                .first()
            )
            if not existing:
                existing = FacebookPage(
                    user_id=user.id,
                    page_id=page_id,
                    page_name=page.get("name") or page_id,
                )
                self.db.add(existing)
            existing.page_name = page.get("name") or existing.page_name
            existing.access_token = page.get("access_token")
            existing.category = page.get("category")
            existing.tasks = ",".join(page.get("tasks", [])) if isinstance(page.get("tasks"), list) else page.get("tasks")
            existing.is_active = True

        for existing in self.db.query(FacebookPage).filter(FacebookPage.user_id == user.id).all():
            if existing.page_id not in saved_page_ids:
                existing.is_active = False
                existing.is_selected = False

        active_pages = (
            self.db.query(FacebookPage)
            .filter(FacebookPage.user_id == user.id, FacebookPage.page_id.in_(saved_page_ids) if saved_page_ids else False)
            .all()
            if saved_page_ids
            else []
        )
        keep_selected = selected_page and selected_page.page_id in saved_page_ids
        for page in active_pages:
            page.is_selected = bool(keep_selected and page.page_id == selected_page.page_id)
        if active_pages and not any(page.is_selected for page in active_pages):
            active_pages[0].is_selected = True

        session.completed_at = _utcnow()
        self.db.commit()
        return user, len(saved_page_ids)

    def get_pages(self, user: User) -> dict[str, object]:
        identity = (
            self.db.query(OAuthIdentity)
            .filter(OAuthIdentity.provider == "facebook", OAuthIdentity.user_id == user.id)
            .first()
        )
        pages = (
            self.db.query(FacebookPage)
            .filter(FacebookPage.user_id == user.id)
            .order_by(FacebookPage.is_selected.desc(), FacebookPage.id.asc())
            .all()
        )
        active_pages = [page for page in pages if page.is_active]
        if not active_pages:
            demo_page = self._ensure_demo_page(user)
            pages = (
                self.db.query(FacebookPage)
                .filter(FacebookPage.user_id == user.id)
                .order_by(FacebookPage.is_selected.desc(), FacebookPage.id.asc())
                .all()
            )
            if demo_page.id not in {page.id for page in pages}:
                pages = [demo_page, *pages]
        return {
            "connected": identity is not None,
            "provider_user_id": identity.provider_user_id if identity else None,
            "pages": pages,
        }

    def select_page(self, user: User, facebook_page_id: str) -> FacebookPage:
        page = (
            self.db.query(FacebookPage)
            .filter(FacebookPage.user_id == user.id, FacebookPage.page_id == facebook_page_id)
            .first()
        )
        if not page:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facebook page not found")
        self.db.query(FacebookPage).filter(FacebookPage.user_id == user.id).update({FacebookPage.is_selected: False})
        page.is_selected = True
        self.db.commit()
        self.db.refresh(page)
        return page

    def disconnect(self, user: User) -> None:
        identity = (
            self.db.query(OAuthIdentity)
            .filter(OAuthIdentity.provider == "facebook", OAuthIdentity.user_id == user.id)
            .first()
        )
        if identity:
            self.db.delete(identity)
        for page in self.db.query(FacebookPage).filter(FacebookPage.user_id == user.id).all():
            page.is_active = False
            page.is_selected = False
            page.access_token = None
        self.db.commit()
