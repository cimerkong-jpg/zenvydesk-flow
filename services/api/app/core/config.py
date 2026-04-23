from typing import Optional
from urllib.parse import urlparse

from pydantic import field_validator
from pydantic_settings import BaseSettings


KNOWN_AI_PROVIDERS = {"mock", "openai", "gemini", "claude", "grok"}
KNOWN_IMAGE_PROVIDERS = {"mock", "openai", "stable_diffusion"}
LOCAL_HOST_MARKERS = ("localhost", "127.0.0.1", "testserver")
STAGING_FRONTEND_URL = "https://zenvydesk-staging.onrender.com"
STAGING_BACKEND_URL = "https://zenvydesk-api-staging.onrender.com"
PRODUCTION_FRONTEND_URL = "https://zenvydesk.site"
PRODUCTION_BACKEND_URL = "https://api.zenvydesk.site"


def _normalize_url(value: Optional[str]) -> str:
    return (value or "").strip().rstrip("/")


def _extract_origin(value: Optional[str]) -> str:
    normalized = _normalize_url(value)
    if not normalized:
        return ""
    parsed = urlparse(normalized)
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return normalized


def _normalize_provider(value: Optional[str], *, allowed: set[str], default: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return default
    if raw in allowed:
        return raw

    candidates = [part.strip().lower() for part in raw.replace(";", ",").split(",") if part.strip()]
    valid = [candidate for candidate in candidates if candidate in allowed]
    if valid:
        non_mock = [candidate for candidate in valid if candidate != "mock"]
        return non_mock[-1] if non_mock else valid[-1]
    return default


class Settings(BaseSettings):
    """Application settings."""

    app_name: str = "ZenvyDesk API"
    app_env: str = "development"
    app_base_url: str = "http://localhost:8000"
    version: str = "v1"
    debug: bool = True

    secret_key: str = "dev_secret_key_change_in_production"
    access_token_expiry_minutes: int = 30
    refresh_token_expiry_days: int = 14
    password_reset_expiry_minutes: int = 30
    oauth_state_expiry_minutes: int = 10
    password_hash_iterations: int = 120000

    database_url: str = "sqlite:///./zenvydesk.db"

    ai_provider: str = "mock"
    ai_model: str = "mock-v1"
    ai_api_key: Optional[str] = None
    ai_base_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    image_provider: str = "mock"
    image_model: str = "mock-image-v1"
    image_api_key: Optional[str] = None
    image_base_url: Optional[str] = None

    facebook_app_id: Optional[str] = None
    facebook_app_secret: Optional[str] = None
    facebook_redirect_uri: str = "http://localhost:8000/api/v1/auth/facebook/callback"
    facebook_scopes: str = "pages_show_list,pages_manage_posts"

    frontend_base_url: Optional[str] = None

    @field_validator("debug", mode="before")
    @classmethod
    def coerce_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production", "0", "false", "no", "off"}:
                return False
            if normalized in {"1", "true", "yes", "on", "debug", "development"}:
                return True
        return value

    def infer_app_env(self, request_base_url: Optional[str] = None) -> str:
        env = (self.app_env or "").strip().lower()
        request_origin = _extract_origin(request_base_url).lower()
        frontend_origin = _extract_origin(self.frontend_base_url).lower()
        app_origin = _extract_origin(self.app_base_url).lower()
        redirect_origin = _extract_origin(self.facebook_redirect_uri).lower()

        signals = [request_origin, frontend_origin, app_origin, redirect_origin]
        if any("staging" in signal for signal in signals if signal):
            return "staging"
        if any(
            "zenvydesk.site" in signal or "api.zenvydesk.site" in signal
            for signal in signals
            if signal
        ):
            return "production"
        if env in {"staging", "production", "prod", "development", "dev"}:
            return "production" if env in {"production", "prod"} else ("staging" if env == "staging" else "development")
        return "development"

    def resolve_app_base_url(self, request_base_url: Optional[str] = None) -> str:
        request_origin = _extract_origin(request_base_url)
        if request_origin and not any(marker in request_origin.lower() for marker in LOCAL_HOST_MARKERS):
            return request_origin

        configured_origin = _extract_origin(self.app_base_url)
        if configured_origin and not any(marker in configured_origin.lower() for marker in LOCAL_HOST_MARKERS):
            return configured_origin

        redirect_origin = _extract_origin(self.facebook_redirect_uri)
        if redirect_origin and not any(marker in redirect_origin.lower() for marker in LOCAL_HOST_MARKERS):
            return redirect_origin

        env = self.infer_app_env(request_base_url)
        if env == "staging":
            return STAGING_BACKEND_URL
        if env == "production":
            return PRODUCTION_BACKEND_URL
        return "http://localhost:8000"

    @property
    def resolved_app_env(self) -> str:
        return self.infer_app_env()

    @property
    def resolved_app_base_url(self) -> str:
        return self.resolve_app_base_url()

    @property
    def resolved_frontend_base_url(self) -> str:
        explicit = _normalize_url(self.frontend_base_url)
        if explicit:
            return explicit

        env = self.infer_app_env()
        if env == "staging":
            return STAGING_FRONTEND_URL
        if env == "production":
            return PRODUCTION_FRONTEND_URL
        return "http://localhost:5173"

    @property
    def resolved_ai_provider(self) -> str:
        return _normalize_provider(
            self.ai_provider,
            allowed=KNOWN_AI_PROVIDERS,
            default="mock",
        )

    @property
    def resolved_image_provider(self) -> str:
        return _normalize_provider(
            self.image_provider,
            allowed=KNOWN_IMAGE_PROVIDERS,
            default="mock",
        )

    @property
    def resolved_ai_api_key(self) -> Optional[str]:
        return self.ai_api_key or self.openai_api_key

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
