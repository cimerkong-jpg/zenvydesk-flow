from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/runtime")
def get_runtime_settings():
    return {
        "app_env": settings.app_env,
        "app_base_url": settings.app_base_url,
        "frontend_base_url": settings.resolved_frontend_base_url,
        "ai_provider": settings.ai_provider,
        "ai_model": settings.ai_model,
        "ai_configured": bool(settings.resolved_ai_api_key) or settings.ai_provider == "mock",
        "image_provider": settings.image_provider,
        "image_model": settings.image_model,
        "image_configured": bool(settings.image_api_key) or settings.image_provider == "mock",
    }
