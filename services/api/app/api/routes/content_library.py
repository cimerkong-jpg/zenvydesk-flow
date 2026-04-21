from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.content_library import ContentLibrary
from app.schemas.content_library import ContentLibraryCreate, ContentLibraryResponse

router = APIRouter()


@router.post("/", response_model=ContentLibraryResponse)
def create_content(content: ContentLibraryCreate, db: Session = Depends(get_db)):
    """Create new content"""
    db_content = ContentLibrary(
        user_id=1,  # Hardcoded for now
        title=content.title,
        content=content.content,
        content_type=content.content_type
    )
    db.add(db_content)
    db.commit()
    db.refresh(db_content)
    return db_content


@router.get("/", response_model=List[ContentLibraryResponse])
def get_content(db: Session = Depends(get_db)):
    """Get all content"""
    content = db.query(ContentLibrary).all()
    return content
