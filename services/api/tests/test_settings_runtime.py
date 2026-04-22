from tests.helpers import override_ai_settings


def test_runtime_settings_endpoint(client):
    with override_ai_settings(ai_provider="mock", image_provider="mock"):
        response = client.get("/api/v1/settings/runtime")

    assert response.status_code == 200
    data = response.json()
    assert "app_env" in data
    assert data["ai_provider"] == "mock"
    assert data["image_provider"] == "mock"
    assert data["ai_configured"] is True
    assert data["image_configured"] is True
