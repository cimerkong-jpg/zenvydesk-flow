from dataclasses import dataclass

from app.core.config import settings
from app.models.content_library import ContentLibrary
from app.models.product import Product
from app.models.user import User
from app.services.ai.prompt_builder import build_prompt
from app.services.ai_generation import generate_post_content
from app.services.market_profiles import get_market_profile
from sqlalchemy.orm import Session


@dataclass
class GeneratedContent:
    content: str
    prompt: str
    provider: str
    model: str
    success: bool
    error: str | None = None


def generate_content(
    product: Product,
    content_library: ContentLibrary | None = None,
    market: str = "TH",
    tone: str = "marketing",
    language: str = "th",
    provider: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    db: Session | None = None,
    user: User | None = None,
) -> GeneratedContent:
    profile = get_market_profile(market)
    resolved_language = language or profile.language
    prompt = build_prompt(
        product=product,
        content_library=content_library,
        market=profile.code,
        tone=tone,
        language=resolved_language,
    )
    result = generate_post_content(
        content_type=content_library.content_type if content_library and content_library.content_type else "general_post",
        product_name=product.name,
        product_description=product.description,
        selling_points=[content_library.content] if content_library and content_library.content else None,
        tone=tone,
        target_audience=profile.audience,
        provider=provider or settings.resolved_ai_provider,
        model=model or settings.ai_model,
        api_key=api_key,
        base_url=base_url,
        prompt_override=prompt,
        db=db,
        user=user,
    )

    if result.success and result.content:
        return GeneratedContent(
            content=result.content,
            prompt=prompt,
            provider=result.provider,
            model=result.model,
            success=True,
            error=None,
        )

    return GeneratedContent(
        content="",
        prompt=prompt,
        provider=result.provider,
        model=result.model,
        success=False,
        error=result.error,
    )
