from fastapi import APIRouter, Request

from app.core.config import settings

router = APIRouter()


@router.get("/runtime")
def get_runtime_settings(request: Request):
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
        "ai_configured": bool(settings.resolved_ai_api_key) or ai_provider == "mock",
        "image_provider": image_provider,
        "image_model": settings.image_model,
        "image_configured": bool(settings.image_api_key) or image_provider == "mock",
    }
