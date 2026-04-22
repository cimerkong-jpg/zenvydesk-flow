from pydantic_settings import BaseSettings
from typing import Optional


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
    openai_api_key: Optional[str] = None  # Backward compatibility

    # Facebook OAuth Lite Configuration
    facebook_app_id: Optional[str] = None
    facebook_app_secret: Optional[str] = None
    facebook_redirect_uri: str = "http://localhost:8000/api/v1/auth/facebook/callback"
    facebook_scopes: str = "pages_show_list,pages_manage_posts"

    # Frontend URL — where OAuth callback redirects the browser back to
    frontend_base_url: str = "https://zenvydesk.onrender.com"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Allow extra fields in .env


settings = Settings()


