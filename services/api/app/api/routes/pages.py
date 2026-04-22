"""Facebook page list and selection endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.facebook_page import FacebookPage


router = APIRouter(prefix="/api/v1/facebook/pages", tags=["facebook"])


class PageResponse(BaseModel):
    id: int
    page_id: str
    page_name: str
    is_active: bool
    is_selected: bool
    has_access_token: bool
    connection_status: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[PageResponse])
def get_pages(db: Session = Depends(get_db)):
    pages = (
        db.query(FacebookPage)
        .order_by(FacebookPage.is_selected.desc(), FacebookPage.id.asc())
        .all()
    )
    return [
        PageResponse(
            id=page.id,
            page_id=page.page_id,
            page_name=page.page_name,
            is_active=page.is_active,
            is_selected=page.is_selected,
            has_access_token=bool(page.access_token),
            connection_status="connected" if page.access_token and page.is_active else "needs_reconnect",
        )
        for page in pages
    ]


@router.post("/select/{page_id}", response_model=PageResponse)
def select_page(page_id: str, db: Session = Depends(get_db)):
    selected_page = db.query(FacebookPage).filter(FacebookPage.page_id == page_id).first()
    if not selected_page:
        raise HTTPException(status_code=404, detail="Facebook page not found")

    db.query(FacebookPage).filter(FacebookPage.user_id == selected_page.user_id).update(
        {FacebookPage.is_selected: False}
    )
    selected_page.is_selected = True
    db.commit()
    db.refresh(selected_page)

    return PageResponse(
        id=selected_page.id,
        page_id=selected_page.page_id,
        page_name=selected_page.page_name,
        is_active=selected_page.is_active,
        is_selected=selected_page.is_selected,
        has_access_token=bool(selected_page.access_token),
        connection_status="connected" if selected_page.access_token and selected_page.is_active else "needs_reconnect",
    )
