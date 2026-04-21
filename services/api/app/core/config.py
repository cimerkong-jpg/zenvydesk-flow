from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    app_name: str = "ZenvyDesk API"
    version: str = "v1"
    debug: bool = True
    
    # AI Provider Configuration
    ai_provider: str = "mock"
    ai_model: str = "mock-v1"
    ai_api_key: Optional[str] = None
    ai_base_url: Optional[str] = None

    # Facebook OAuth Lite Configuration
    facebook_app_id: Optional[str] = None
    facebook_app_secret: Optional[str] = None
    facebook_redirect_uri: str = "http://localhost:8000/api/v1/auth/facebook/callback"
    facebook_scopes: str = "pages_show_list,pages_manage_posts"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
