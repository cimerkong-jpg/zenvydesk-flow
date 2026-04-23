from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.facebook_connection import FacebookPagesResponse, FacebookPageResponse
from app.services.facebook_connection_service import FacebookConnectionService
from app.services.permission_service import get_current_user


router = APIRouter(prefix="/api/v1/facebook/pages", tags=["facebook-pages-legacy"])


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


@router.get("", response_model=FacebookPagesResponse)
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


@router.post("/select/{page_id}", response_model=FacebookPageResponse)
def select_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = FacebookConnectionService(db).select_page(current_user, page_id)
    return _serialize_page(page)
