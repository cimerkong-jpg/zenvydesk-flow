from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.content_library import ContentLibrary
from app.models.draft import Draft
from app.models.product import Product
from app.models.user import User
from app.schemas.draft import DraftCreate, DraftResponse
from app.schemas.draft_generation import DraftGenerateRequest, DraftGenerateResponse
from app.services.ai.content_generator import generate_content
from app.services.ai.image_generator import generate_image
from app.services.market_profiles import get_market_profile
from app.services.permission_service import get_current_user

router = APIRouter()


@router.post("/", response_model=DraftResponse)
def create_draft(
    draft: DraftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_draft = Draft(
        user_id=current_user.id,
        page_id=draft.page_id,
        product_id=draft.product_id,
        content_library_id=draft.content_library_id,
        content=draft.content,
        media_url=draft.media_url,
        status="draft",  # Default status
        scheduled_time=draft.scheduled_time
    )
    db.add(db_draft)
    db.commit()
    db.refresh(db_draft)
    return db_draft


@router.get("/", response_model=List[DraftResponse])
def get_drafts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    drafts = (
        db.query(Draft)
        .filter(Draft.user_id == current_user.id)
        .order_by(Draft.created_at.desc(), Draft.id.desc())
        .all()
    )
    return drafts


@router.put("/{draft_id}", response_model=DraftResponse)
def update_draft(
    draft_id: int,
    draft: DraftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_draft = db.query(Draft).filter(Draft.id == draft_id, Draft.user_id == current_user.id).first()
    if not db_draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    db_draft.page_id = draft.page_id
    db_draft.product_id = draft.product_id
    db_draft.content_library_id = draft.content_library_id
    db_draft.content = draft.content
    db_draft.media_url = draft.media_url
    db_draft.scheduled_time = draft.scheduled_time
    
    db.commit()
    db.refresh(db_draft)
    return db_draft


@router.delete("/{draft_id}")
def delete_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_draft = db.query(Draft).filter(Draft.id == draft_id, Draft.user_id == current_user.id).first()
    if not db_draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    db.delete(db_draft)
    db.commit()
    return {"message": "Draft deleted successfully"}


@router.post("/generate", response_model=DraftGenerateResponse)
def generate_draft_content(
    payload: DraftGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == payload.product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    content_library = None
    if payload.content_library_id is not None:
        content_library = (
            db.query(ContentLibrary)
            .filter(ContentLibrary.id == payload.content_library_id, ContentLibrary.user_id == current_user.id)
            .first()
        )
        if not content_library:
            raise HTTPException(status_code=404, detail="Content library item not found")

    generated_content = generate_content(
        product=product,
        content_library=content_library,
        market=payload.market or "TH",
        tone=payload.tone,
        language=payload.language,
        provider=payload.ai_provider,
        model=payload.ai_model,
        base_url=payload.ai_base_url,
        db=db,
        user=current_user,
    )
    if not generated_content.success:
        raise HTTPException(status_code=400, detail=generated_content.error or "AI generation failed")

    media_url = generate_image(
        "\n".join([generated_content.prompt, get_market_profile(payload.market).image_guidance]),
        provider_name=payload.image_provider,
        model=payload.image_model,
        base_url=payload.image_base_url,
        db=db,
        user=current_user,
    )
    return DraftGenerateResponse(
        content=generated_content.content,
        media_url=media_url,
    )


@router.post("/generate-image", response_model=DraftGenerateResponse)
def generate_draft_image(
    payload: DraftGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == payload.product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    content_library = None
    if payload.content_library_id is not None:
        content_library = (
            db.query(ContentLibrary)
            .filter(ContentLibrary.id == payload.content_library_id, ContentLibrary.user_id == current_user.id)
            .first()
        )
        if not content_library:
            raise HTTPException(status_code=404, detail="Content library item not found")

    generated_content = generate_content(
        product=product,
        content_library=content_library,
        market=payload.market or "TH",
        tone=payload.tone,
        language=payload.language,
        provider=payload.ai_provider,
        model=payload.ai_model,
        base_url=payload.ai_base_url,
        db=db,
        user=current_user,
    )
    if not generated_content.success:
        raise HTTPException(status_code=400, detail=generated_content.error or "AI generation failed")
    media_prompt = "\n".join(
        [
            generated_content.prompt,
            get_market_profile(payload.market).image_guidance,
            f"Visual style: {payload.style or 'social ad creative'}",
            f"Draft content context: {generated_content.content}",
        ]
    )
    return DraftGenerateResponse(
        content=generated_content.content,
        media_url=generate_image(
            media_prompt,
            provider_name=payload.image_provider,
            model=payload.image_model,
            base_url=payload.image_base_url,
            db=db,
            user=current_user,
        ),
    )
