from dataclasses import dataclass

from app.core.config import settings
from app.models.content_library import ContentLibrary
from app.models.product import Product
from app.services.ai.prompt_builder import build_prompt
from app.services.ai_generation import generate_post_content


@dataclass
class GeneratedContent:
    content: str
    prompt: str


def generate_content(
    product: Product,
    content_library: ContentLibrary | None = None,
    tone: str = "marketing",
    language: str = "th",
    provider: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
) -> GeneratedContent:
    prompt = build_prompt(
        product=product,
        content_library=content_library,
        tone=tone,
        language=language,
    )
    result = generate_post_content(
        content_type=content_library.content_type if content_library and content_library.content_type else "general_post",
        product_name=product.name,
        product_description=product.description,
        selling_points=[content_library.content] if content_library and content_library.content else None,
        tone=tone,
        target_audience="Thai market" if language.lower() == "th" else f"{language} market",
        provider=provider or settings.resolved_ai_provider,
        model=model or settings.ai_model,
        api_key=api_key,
        base_url=base_url,
        prompt_override=prompt,
    )

    if result.success and result.content:
        return GeneratedContent(content=result.content, prompt=prompt)

    fallback_parts = [f"{product.name} is ready for your next post."]
    if product.description:
        fallback_parts.append(product.description)
    if content_library and content_library.content:
        fallback_parts.append(content_library.content)
    fallback_parts.append(f"Tone: {tone}.")
    fallback_parts.append("Generated content preview for manual editing.")
    return GeneratedContent(content=" ".join(fallback_parts), prompt=prompt)
