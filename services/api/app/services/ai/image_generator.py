from app.core.config import settings
from app.services.ai_providers.image_registry import get_image_provider


def generate_image(prompt: str) -> str:
    provider = get_image_provider(
        provider_name=settings.resolved_image_provider,
        api_key=settings.image_api_key,
        base_url=settings.image_base_url,
    )
    return provider.generate_image(prompt=prompt, model=settings.image_model)
