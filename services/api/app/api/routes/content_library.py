from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.content_library import ContentLibrary
from app.models.user import User
from app.schemas.content_library import ContentLibraryCreate, ContentLibraryResponse
from app.services.permission_service import get_current_user

router = APIRouter()


@router.post("/", response_model=ContentLibraryResponse)
def create_content(
    content: ContentLibraryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_content = ContentLibrary(
        user_id=current_user.id,
        title=content.title,
        content=content.content,
        content_type=content.content_type
    )
    db.add(db_content)
    db.commit()
    db.refresh(db_content)
    return db_content


@router.get("/", response_model=List[ContentLibraryResponse])
def get_content(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = (
        db.query(ContentLibrary)
        .filter(ContentLibrary.user_id == current_user.id)
        .order_by(ContentLibrary.created_at.desc(), ContentLibrary.id.desc())
        .all()
    )
    return content


@router.put("/{content_id}", response_model=ContentLibraryResponse)
def update_content(
    content_id: int,
    content: ContentLibraryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_content = (
        db.query(ContentLibrary)
        .filter(ContentLibrary.id == content_id, ContentLibrary.user_id == current_user.id)
        .first()
    )
    if not db_content:
        raise HTTPException(status_code=404, detail="Content item not found")

    db_content.title = content.title
    db_content.content = content.content
    db_content.content_type = content.content_type
    db.commit()
    db.refresh(db_content)
    return db_content


@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_content = (
        db.query(ContentLibrary)
        .filter(ContentLibrary.id == content_id, ContentLibrary.user_id == current_user.id)
        .first()
    )
    if not db_content:
        raise HTTPException(status_code=404, detail="Content item not found")

    db.delete(db_content)
    db.commit()
    return {"message": "Content item deleted successfully"}
