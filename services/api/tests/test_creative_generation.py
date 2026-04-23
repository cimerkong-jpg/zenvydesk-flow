from tests.helpers import override_ai_settings


def test_generate_creative_post(client, test_user, test_product, test_content_library, auth_headers):
    with override_ai_settings(ai_provider="mock", image_provider="mock"):
        response = client.post(
            "/api/v1/creative/generate",
            json={
                "product_id": test_product.id,
                "content_library_id": test_content_library.id,
                "market": "TH",
                "user_prompt": "Write a sales post for this product",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["content"].startswith("[mock/mock-v1]")
    assert data["media_url"].startswith("data:image/")
    assert data["ai_provider"] == "mock"
    assert data["image_provider"] == "mock"


def test_generate_creative_content_only_has_no_media(client, test_user, test_product, auth_headers):
    with override_ai_settings(ai_provider="mock", ai_model="mock-v1", image_provider="mock"):
        response = client.post(
            "/api/v1/creative/generate",
            json={
                "product_id": test_product.id,
                "market": "TH",
                "user_prompt": "Write content only",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["content"].startswith("[mock/mock-v1]")
    assert data["media_url"].startswith("data:image/")


def test_generate_creative_uses_resolved_image_provider(monkeypatch, client, test_user, test_product, auth_headers):
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
                "product_id": test_product.id,
                "market": "TH",
                "user_prompt": "Create a social media post",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["media_url"] == "https://example.com/creative.png"
    assert data["image_provider"] == "mock"
    assert data["image_model"] == "mock-image-v1"
    assert captured["provider_name"] == "mock"
    assert captured["model"] == "mock-image-v1"
    assert captured["preferred_ai_provider"] == "mock"


def test_generate_creative_forwards_user_prompt(monkeypatch, client, test_user, test_product, auth_headers):
    captured = {}

    def fake_generate_content(**kwargs):
        from app.services.ai.content_generator import GeneratedContent

        captured["user_prompt"] = kwargs["user_prompt"]
        return GeneratedContent(
            content="Creative body",
            prompt="Creative prompt",
            provider="openai",
            model="gpt-4o-mini",
            success=True,
            error=None,
        )

    def fake_generate_image(*args, **kwargs):
        return "https://example.com/creative.png"

    monkeypatch.setattr("app.api.routes.creative.generate_content", fake_generate_content)
    monkeypatch.setattr("app.api.routes.creative.generate_image", fake_generate_image)

    response = client.post(
        "/api/v1/creative/generate",
        json={
            "product_id": test_product.id,
            "market": "VN",
            "user_prompt": "Viết bài bán hàng kéo inbox",
        },
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    assert captured["user_prompt"] == "Viết bài bán hàng kéo inbox"
