from app.core.config import settings
from app.services.ai_providers.image_registry import get_image_provider


def generate_image(
    prompt: str,
    provider_name: str | None = None,
    model: str | None = None,
) -> str:
    provider = get_image_provider(
        provider_name=provider_name or settings.resolved_image_provider,
        api_key=settings.image_api_key,
        base_url=settings.image_base_url,
    )
    return provider.generate_image(prompt=prompt, model=model or settings.image_model)
