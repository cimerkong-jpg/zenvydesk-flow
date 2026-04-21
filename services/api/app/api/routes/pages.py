"""Minimal Facebook page list endpoint for the UI flow."""

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.facebook_page import FacebookPage


router = APIRouter(prefix="/api/v1/facebook/pages", tags=["facebook"])


class PageResponse(BaseModel):
    page_id: str
    page_name: str
    is_active: bool

    class Config:
        from_attributes = True


@router.get("", response_model=List[PageResponse])
def get_pages(db: Session = Depends(get_db)):
    return (
        db.query(FacebookPage)
        .order_by(FacebookPage.id.asc())
        .all()
    )