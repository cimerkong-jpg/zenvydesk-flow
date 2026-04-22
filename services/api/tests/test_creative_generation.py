from tests.helpers import override_ai_settings


def test_generate_creative_post(client, test_product, test_content_library):
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
        )

    assert response.status_code == 200
    data = response.json()
    assert data["generation_type"] == "post"
    assert data["content"].startswith("[mock/mock-v1]")
    assert data["media_url"].startswith("data:image/")
    assert data["ai_provider"] == "mock"
    assert data["image_provider"] == "mock"


def test_generate_creative_content_only_has_no_media(client, test_product):
    with override_ai_settings(ai_provider="mock", image_provider="mock"):
        response = client.post(
            "/api/v1/creative/generate",
            json={
                "generation_type": "content",
                "product_id": test_product.id,
                "tone": "professional",
                "language": "th",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["generation_type"] == "content"
    assert data["content"].startswith("[mock/mock-v1]")
    assert data["media_url"] is None
