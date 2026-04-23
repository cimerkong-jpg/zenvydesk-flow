from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.user_ai_key_service import PROVIDER_LABELS, UserAiKeyService


@dataclass
class ResolvedAiKey:
    provider: str
    api_key: str
    source: str


def _resolve_user_key(
    db: Session | None,
    provider: str,
    *,
    user: User | None = None,
) -> ResolvedAiKey | None:
    normalized = (provider or "").strip().lower()
    if normalized in {"", "mock", "stable_diffusion"}:
        return None

    if user is not None:
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Database session is required for user AI key resolution.",
            )
        service = UserAiKeyService(db)
        row = service.get_user_key_record(user.id, normalized)
        if row:
            if row.validation_status == "invalid":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stored {PROVIDER_LABELS[normalized]} API key is invalid.",
                )
            try:
                return ResolvedAiKey(
                    provider=normalized,
                    api_key=service.decrypt_key(row),
                    source="user",
                )
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stored {PROVIDER_LABELS[normalized]} API key is invalid.",
                ) from exc

    return None


def resolve_manager_openai_key() -> ResolvedAiKey:
    api_key = settings.resolved_openai_manager_api_key
    if api_key:
        source = "env:manager" if settings.openai_manager_api_key else "env:openai_fallback"
        return ResolvedAiKey(provider="openai", api_key=api_key, source=source)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="GPT Manager is not configured. Set OPENAI_MANAGER_API_KEY or OPENAI_API_KEY.",
    )


def resolve_execution_api_key(
    db: Session | None,
    provider: str,
    *,
    user: User | None = None,
) -> ResolvedAiKey | None:
    normalized = (provider or "").strip().lower()
    if normalized in {"", "mock"}:
        return None

    user_key = _resolve_user_key(db, normalized, user=user)
    if user_key:
        return user_key

    env_key = settings.get_execution_fallback_api_key(normalized)
    if env_key:
        return ResolvedAiKey(provider=normalized, api_key=env_key, source="env")

    if normalized in PROVIDER_LABELS:
        if normalized == "openai":
            detail = "No OpenAI API key configured for this user, and no system fallback key is available."
        else:
            detail = f"No {PROVIDER_LABELS[normalized]} API key configured for this user. Add a personal API key in Settings to use this provider."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported provider: {normalized}",
    )


def resolve_effective_api_key(
    db: Session | None,
    provider: str,
    *,
    user: User | None = None,
    image: bool = False,
) -> ResolvedAiKey | None:
    normalized = (provider or "").strip().lower()
    if normalized in {"", "mock", "stable_diffusion"}:
        return None

    user_key = _resolve_user_key(db, normalized, user=user)
    if user_key:
        return user_key

    env_key = settings.get_provider_api_key(normalized, image=image)
    if env_key:
        return ResolvedAiKey(provider=normalized, api_key=env_key, source="env")

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"No {PROVIDER_LABELS.get(normalized, normalized)} API key configured for this user, and no system fallback key is available.",
    )
