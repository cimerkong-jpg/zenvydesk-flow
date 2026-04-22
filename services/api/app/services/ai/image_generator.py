from app.core.config import settings
from app.services.ai_providers.image_registry import get_image_provider


def generate_image(
    prompt: str,
    provider_name: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
) -> str:
    provider = get_image_provider(
        provider_name=provider_name or settings.resolved_image_provider,
        api_key=api_key or settings.image_api_key,
        base_url=base_url or settings.image_base_url,
    )
    return provider.generate_image(prompt=prompt, model=model or settings.image_model)
