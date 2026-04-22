from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    app_name: str = "ZenvyDesk API"
    app_env: str = "development"
    app_base_url: str = "http://localhost:8000"
    version: str = "v1"
    debug: bool = True

    # Security
    secret_key: str = "dev_secret_key_change_in_production"
    session_expiry_minutes: int = 60

    # Database
    database_url: str = "sqlite:///./zenvydesk.db"

    # AI Provider Configuration
    ai_provider: str = "mock"
    ai_model: str = "mock-v1"
    ai_api_key: Optional[str] = None
    ai_base_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    image_provider: str = "mock"
    image_model: str = "mock-image-v1"
    image_api_key: Optional[str] = None
    image_base_url: Optional[str] = None

    # Facebook OAuth Lite Configuration
    facebook_app_id: Optional[str] = None
    facebook_app_secret: Optional[str] = None
    facebook_redirect_uri: str = "http://localhost:8000/api/v1/auth/facebook/callback"
    facebook_scopes: str = "pages_show_list,pages_manage_posts"

    # Explicit override when needed; otherwise resolve from environment.
    frontend_base_url: Optional[str] = None

    @property
    def resolved_frontend_base_url(self) -> str:
        """Resolve the frontend redirect target for the current environment."""
        if self.frontend_base_url:
            return self.frontend_base_url

        env = (self.app_env or "").lower()
        base_url = (self.app_base_url or "").lower()

        if "staging" in env or "staging" in base_url:
            return "https://zenvydesk-staging.onrender.com"

        if env in {"production", "prod"} or "api.zenvydesk.site" in base_url:
            return "https://zenvydesk.site"

        return "http://localhost:5173"

    @property
    def resolved_ai_api_key(self) -> Optional[str]:
        """Prefer explicit AI_API_KEY but fall back to OPENAI_API_KEY for OpenAI-backed flows."""
        return self.ai_api_key or self.openai_api_key

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
