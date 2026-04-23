from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import MANAGED_AI_PROVIDERS, settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user_ai_api_key import (
    UserAiApiKeyListResponse,
    UserAiApiKeyStatusResponse,
    UserAiApiKeyUpsertRequest,
    UserAiApiKeyValidationResponse,
)
from app.services.permission_service import get_current_user, require_roles
from app.services.user_ai_key_service import UserAiKeyService

router = APIRouter()


@router.get("/runtime")
def get_runtime_settings(
    request: Request,
    current_user: User = Depends(require_roles("admin", "super_admin")),
):
    effective_base_url = settings.resolve_app_base_url(str(request.base_url))
    effective_env = settings.infer_app_env(str(request.base_url))
    ai_provider = settings.resolved_ai_provider
    image_provider = settings.resolved_image_provider
    return {
        "app_env": effective_env,
        "app_base_url": effective_base_url,
        "frontend_base_url": settings.resolved_frontend_base_url,
        "ai_provider": ai_provider,
        "ai_model": settings.ai_model,
        "ai_configured": bool(settings.get_execution_fallback_api_key(ai_provider)) or ai_provider == "mock",
        "manager_ai_enabled": bool(settings.resolved_openai_manager_api_key),
        "execution_openai_fallback_available": bool(settings.get_execution_fallback_api_key("openai")),
        "image_provider": image_provider,
        "image_model": settings.image_model,
        "image_configured": bool(settings.get_provider_api_key(image_provider, image=True)) or image_provider == "mock",
    }


@router.get("/ai-keys", response_model=UserAiApiKeyListResponse)
def list_user_ai_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserAiKeyService(db)
    return {
        "items": [
            UserAiApiKeyStatusResponse(**item)
            for item in service.list_key_statuses(current_user, lambda provider: settings.get_execution_fallback_api_key(provider))
        ]
    }


@router.put("/ai-keys/{provider}", response_model=UserAiApiKeyStatusResponse)
def upsert_user_ai_key(
    provider: str,
    payload: UserAiApiKeyUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if provider not in MANAGED_AI_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported provider")
    service = UserAiKeyService(db)
    row = service.upsert_key(current_user, provider, payload.api_key)
    return UserAiApiKeyStatusResponse(
        provider=row.provider,
        is_configured=True,
        key_hint=row.key_hint,
        validation_status=row.validation_status or "unknown",
        last_validated_at=row.last_validated_at,
        source="user",
    )


@router.delete("/ai-keys/{provider}")
def delete_user_ai_key(
    provider: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserAiKeyService(db)
    service.delete_key(current_user, provider)
    return {"message": "AI key deleted"}


@router.post("/ai-keys/{provider}/validate", response_model=UserAiApiKeyValidationResponse)
def validate_user_ai_key(
    provider: str,
    payload: UserAiApiKeyUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    service = UserAiKeyService(db)
    result = service.validate_key(provider, payload.api_key)
    return UserAiApiKeyValidationResponse(
        provider=result.provider,
        validation_status=result.validation_status,
        message=result.message,
    )
