from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.content_library import ContentLibrary
from app.models.product import Product
from app.schemas.creative_generation import CreativeGenerateRequest, CreativeGenerateResponse
from app.services.ai.content_generator import generate_content
from app.services.ai.image_generator import generate_image

router = APIRouter()


def _load_context(db: Session, payload: CreativeGenerateRequest):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    content_library = None
    if payload.content_library_id is not None:
        content_library = (
            db.query(ContentLibrary).filter(ContentLibrary.id == payload.content_library_id).first()
        )
        if not content_library:
            raise HTTPException(status_code=404, detail="Content library item not found")

    return product, content_library


@router.post("/generate", response_model=CreativeGenerateResponse)
def generate_creative(payload: CreativeGenerateRequest, db: Session = Depends(get_db)):
    product, content_library = _load_context(db, payload)
    ai_provider = payload.ai_provider or settings.resolved_ai_provider
    ai_model = payload.ai_model or settings.ai_model
    image_provider = payload.image_provider or settings.resolved_image_provider
    image_model = payload.image_model or settings.image_model

    generated = generate_content(
        product=product,
        content_library=content_library,
        tone=payload.tone,
        language=payload.language,
        provider=ai_provider,
        model=ai_model,
        api_key=payload.ai_api_key,
        base_url=payload.ai_base_url,
    )

    media_url = None
    if payload.generation_type in {"post", "image"}:
        image_prompt = "\n".join(
            [
                generated.prompt,
                f"Visual style: {payload.style or 'social ad creative'}",
                f"Draft content context: {generated.content}",
            ]
        )
        media_url = generate_image(
            image_prompt,
            provider_name=image_provider,
            model=image_model,
            api_key=payload.image_api_key or payload.ai_api_key,
            base_url=payload.image_base_url,
        )

    if payload.generation_type == "image":
        generated.content = generated.content

    return CreativeGenerateResponse(
        generation_type=payload.generation_type,
        content=generated.content,
        media_url=media_url,
        ai_provider=ai_provider,
        ai_model=ai_model,
        image_provider=image_provider,
        image_model=image_model,
    )
