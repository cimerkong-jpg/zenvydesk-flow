from __future__ import annotations

from app.core.config import settings
from app.models.user import User
from app.services.ai_key_resolver import resolve_effective_api_key
from app.services.ai_providers.image_registry import get_image_provider
from app.services.user_ai_key_service import UserAiKeyService
from sqlalchemy.orm import Session


REAL_IMAGE_PROVIDER_BY_AI_PROVIDER = {
    "openai": "openai",
}


def resolve_image_provider_name(
    provider_name: str | None = None,
    *,
    preferred_ai_provider: str | None = None,
    db: Session | None = None,
    user: User | None = None,
) -> str:
    explicit = (provider_name or "").strip().lower()
    if explicit:
        return explicit

    preferred = REAL_IMAGE_PROVIDER_BY_AI_PROVIDER.get((preferred_ai_provider or "").strip().lower())
    if preferred:
        return preferred

    if db is not None and user is not None:
        row = UserAiKeyService(db).get_user_key_record(user.id, "openai")
        if row and row.validation_status != "invalid":
            return "openai"

    system_provider = settings.resolved_image_provider
    if system_provider != "mock":
        return system_provider

    if settings.get_provider_api_key("openai", image=True):
        return "openai"

    return system_provider


def resolve_image_model_name(provider_name: str, model: str | None = None) -> str:
    explicit = (model or "").strip()
    if explicit:
        return explicit

    configured = (settings.image_model or "").strip()
    normalized_provider = (provider_name or "").strip().lower()
    if normalized_provider == "openai":
        if configured and not configured.startswith("mock"):
            return configured
        return "gpt-image-1"
    if configured:
        return configured
    return "mock-image-v1"


def generate_image(
    prompt: str,
    provider_name: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    db: Session | None = None,
    user: User | None = None,
    preferred_ai_provider: str | None = None,
) -> str:
    provider_name = resolve_image_provider_name(
        provider_name,
        preferred_ai_provider=preferred_ai_provider,
        db=db,
        user=user,
    )
    model_name = resolve_image_model_name(provider_name, model)
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
    return provider.generate_image(prompt=prompt, model=model_name)
