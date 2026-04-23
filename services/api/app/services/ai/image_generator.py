from app.core.config import settings
from app.models.user import User
from app.services.ai_key_resolver import resolve_effective_api_key
from app.services.ai_providers.image_registry import get_image_provider
from sqlalchemy.orm import Session


def generate_image(
    prompt: str,
    provider_name: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    db: Session | None = None,
    user: User | None = None,
) -> str:
    provider_name = provider_name or settings.resolved_image_provider
    resolved_key = None
    if provider_name not in {"mock", "stable_diffusion"}:
        resolved_key = (
            resolve_effective_api_key(db, provider_name, user=user, image=True)
            if api_key is None
            else None
        )
    provider = get_image_provider(
        provider_name=provider_name,
        api_key=api_key or (resolved_key.api_key if resolved_key else None),
        base_url=base_url or settings.image_base_url,
    )
    return provider.generate_image(prompt=prompt, model=model or settings.image_model)
