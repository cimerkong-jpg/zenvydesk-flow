from tests.helpers import override_ai_settings


def test_runtime_settings_endpoint(client, admin_user, auth_headers):
    with override_ai_settings(ai_provider="mock", image_provider="mock"):
        response = client.get("/api/v1/settings/runtime", headers=auth_headers(admin_user))

    assert response.status_code == 200
    data = response.json()
    assert "app_env" in data
    assert data["ai_provider"] == "mock"
    assert data["image_provider"] == "mock"
    assert data["ai_configured"] is True
    assert data["manager_ai_enabled"] is False
    assert data["execution_openai_fallback_available"] is False
    assert data["image_configured"] is True


def test_runtime_settings_normalizes_staging_env_and_provider(client, admin_user, auth_headers):
    with override_ai_settings(
        ai_provider="mock,openai",
        openai_manager_api_key="sk-manager-runtime-1234",
        openai_api_key="sk-openai-runtime-5678",
        image_provider="mock",
    ):
        from app.core.config import settings

        original_app_env = settings.app_env
        original_app_base_url = settings.app_base_url
        original_frontend_base_url = settings.frontend_base_url
        original_redirect = settings.facebook_redirect_uri
        settings.app_env = "development"
        settings.app_base_url = "http://localhost:8000"
        settings.frontend_base_url = "https://zenvydesk-staging.onrender.com/"
        settings.facebook_redirect_uri = "https://zenvydesk-api-staging.onrender.com/api/v1/auth/facebook/callback"
        try:
            response = client.get("/api/v1/settings/runtime", headers=auth_headers(admin_user))
        finally:
            settings.app_env = original_app_env
            settings.app_base_url = original_app_base_url
            settings.frontend_base_url = original_frontend_base_url
            settings.facebook_redirect_uri = original_redirect

    assert response.status_code == 200
    data = response.json()
    assert data["app_env"] == "staging"
    assert data["app_base_url"] == "https://zenvydesk-api-staging.onrender.com"
    assert data["frontend_base_url"] == "https://zenvydesk-staging.onrender.com"
    assert data["ai_provider"] == "openai"
    assert data["manager_ai_enabled"] is True
    assert data["execution_openai_fallback_available"] is True
