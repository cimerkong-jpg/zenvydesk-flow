from tests.helpers import override_ai_settings


def test_generate_creative_post(client, test_user, test_product, test_content_library, auth_headers):
    with override_ai_settings(ai_provider="mock", image_provider="mock"):
        response = client.post(
            "/api/v1/creative/generate",
            json={
                "generation_type": "post",
                "product_id": test_product.id,
                "content_library_id": test_content_library.id,
                "tone": "friendly",
                "language": "en",
                "style": "product showcase",
                "ai_provider": "mock",
                "ai_model": "mock-v1",
                "image_provider": "mock",
                "image_model": "mock-image-v1",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["generation_type"] == "post"
    assert data["content"].startswith("[mock/mock-v1]")
    assert data["media_url"].startswith("data:image/")
    assert data["ai_provider"] == "mock"
    assert data["image_provider"] == "mock"


def test_generate_creative_content_only_has_no_media(client, test_user, test_product, auth_headers):
    with override_ai_settings(ai_provider="mock", ai_model="mock-v1", image_provider="mock"):
        response = client.post(
            "/api/v1/creative/generate",
            json={
                "generation_type": "content",
                "product_id": test_product.id,
                "tone": "professional",
                "language": "th",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["generation_type"] == "content"
    assert data["content"].startswith("[mock/mock-v1]")
    assert data["media_url"] is None


def test_generate_creative_image_uses_resolved_openai_image_provider(monkeypatch, client, test_user, test_product, auth_headers):
    captured = {}

    def fake_generate_content(**kwargs):
        from app.services.ai.content_generator import GeneratedContent

        return GeneratedContent(
            content="Creative body",
            prompt="Creative prompt",
            provider="mock",
            model="mock-v1",
            success=True,
            error=None,
        )

    def fake_generate_image(prompt, provider_name=None, model=None, api_key=None, base_url=None, db=None, user=None, preferred_ai_provider=None):
        captured["provider_name"] = provider_name
        captured["model"] = model
        captured["preferred_ai_provider"] = preferred_ai_provider
        return "https://example.com/creative.png"

    monkeypatch.setattr("app.api.routes.creative.generate_content", fake_generate_content)
    monkeypatch.setattr("app.api.routes.creative.generate_image", fake_generate_image)

    with override_ai_settings(image_provider="mock", image_model="mock-image-v1"):
        response = client.post(
            "/api/v1/creative/generate",
            json={
                "generation_type": "image",
                "product_id": test_product.id,
                "ai_provider": "openai",
                "ai_model": "gpt-4o-mini",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["media_url"] == "https://example.com/creative.png"
    assert data["image_provider"] == "openai"
    assert data["image_model"] == "gpt-image-1"
    assert captured["provider_name"] == "openai"
    assert captured["model"] == "gpt-image-1"
    assert captured["preferred_ai_provider"] == "openai"
