from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.facebook_connection import (
    DisconnectFacebookResponse,
    FacebookConnectionStartResponse,
    FacebookPagesResponse,
    FacebookPageResponse,
    SelectFacebookPageRequest,
)
from app.services.facebook_connection_service import FacebookConnectionService
from app.services.permission_service import get_current_user


router = APIRouter(prefix="/api/v1/connections/facebook", tags=["facebook-connections"])
legacy_router = APIRouter(prefix="/api/v1/auth/facebook", tags=["facebook-connections-legacy"])


def _frontend_redirect(**params: str) -> RedirectResponse:
    base = settings.resolved_frontend_base_url.rstrip("/")
    query = urlencode({key: value for key, value in params.items() if value is not None})
    return RedirectResponse(url=f"{base}/connections?{query}")


def _serialize_page(page) -> FacebookPageResponse:
    return FacebookPageResponse(
        id=page.id,
        facebook_page_id=page.page_id,
        page_name=page.page_name,
        category=page.category,
        tasks=page.tasks,
        is_active=page.is_active,
        is_selected=page.is_selected,
        has_access_token=bool(page.access_token),
        connection_status="connected" if page.access_token and page.is_active else "needs_reconnect",
    )


@router.get("/start", response_model=FacebookConnectionStartResponse)
def start_connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FacebookConnectionService(db).start_connection(current_user)


@router.get("/callback")
async def callback(
    state: str | None = Query(default=None),
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    service = FacebookConnectionService(db)
    try:
        _, pages_saved = await service.handle_callback(state, code, error)
    except Exception as exc:
        detail = getattr(exc, "detail", str(exc))
        return _frontend_redirect(fb_error=str(detail))
    return _frontend_redirect(fb_connected="1", pages_saved=str(pages_saved))


@router.get("/pages", response_model=FacebookPagesResponse)
def get_pages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = FacebookConnectionService(db).get_pages(current_user)
    return {
        "connected": payload["connected"],
        "provider_user_id": payload["provider_user_id"],
        "pages": [_serialize_page(page) for page in payload["pages"]],
    }


@router.post("/select-page", response_model=FacebookPageResponse)
def select_page(
    payload: SelectFacebookPageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = FacebookConnectionService(db).select_page(current_user, payload.facebook_page_id)
    return _serialize_page(page)


@router.post("/disconnect", response_model=DisconnectFacebookResponse)
def disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    FacebookConnectionService(db).disconnect(current_user)
    return {"message": "Facebook disconnected"}


@legacy_router.get("/login")
def legacy_login_redirect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = FacebookConnectionService(db).start_connection(current_user)
    return RedirectResponse(url=result["authorization_url"])


@legacy_router.get("/callback")
async def legacy_callback(
    state: str | None = Query(default=None),
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return await callback(state=state, code=code, error=error, db=db)
