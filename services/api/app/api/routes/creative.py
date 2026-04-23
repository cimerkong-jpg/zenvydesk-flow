from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.content_library import ContentLibrary
from app.models.product import Product
from app.models.user import User
from app.schemas.creative_generation import CreativeGenerateRequest, CreativeGenerateResponse
from app.services.ai.content_generator import generate_content
from app.services.ai.image_generator import generate_image, resolve_image_model_name, resolve_image_provider_name
from app.services.market_profiles import get_market_profile
from app.services.permission_service import get_current_user

router = APIRouter()


def _load_context(db: Session, payload: CreativeGenerateRequest, current_user: User):
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

    return product, content_library


@router.post("/generate", response_model=CreativeGenerateResponse)
def generate_creative(
    payload: CreativeGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product, content_library = _load_context(db, payload, current_user)
    ai_provider = settings.resolved_ai_provider
    ai_model = settings.ai_model
    image_provider = resolve_image_provider_name(
        None,
        preferred_ai_provider=ai_provider,
        db=db,
        user=current_user,
    )
    image_model = resolve_image_model_name(image_provider, None)

    generated = generate_content(
        product=product,
        content_library=content_library,
        market=payload.market or "TH",
        user_prompt=payload.user_prompt,
        provider=ai_provider,
        model=ai_model,
        db=db,
        user=current_user,
    )
    if not generated.success:
        raise HTTPException(status_code=400, detail=generated.error or "AI generation failed")

    image_prompt = "\n".join(
        [
            generated.prompt,
            get_market_profile(payload.market).image_guidance,
            "Visual style: social ad creative",
            f"Draft content context: {generated.content}",
        ]
    )
    media_url = generate_image(
        image_prompt,
        provider_name=image_provider,
        model=image_model,
        db=db,
        user=current_user,
        preferred_ai_provider=ai_provider,
    )

    return CreativeGenerateResponse(
        content=generated.content,
        media_url=media_url,
        ai_provider=ai_provider,
        ai_model=ai_model,
        image_provider=image_provider,
        image_model=image_model,
    )
