from app.services.ai_providers.types import AIGenerationResult
from app.services.ai.content_generator import GeneratedContent

from app.models.draft import Draft
from tests.helpers import override_ai_settings


def test_create_draft_without_page(client, test_user, auth_headers):
    response = client.post(
        "/api/v1/drafts/",
        json={
            "content": "Draft without selected page",
            "page_id": None,
            "product_id": None,
            "content_library_id": None,
            "media_url": None,
            "scheduled_time": None,
        },
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Draft without selected page"
    assert data["page_id"] is None
    assert data["status"] == "draft"


def test_post_from_draft_requires_page(client, test_db, test_user, auth_headers):
    draft = Draft(
        user_id=test_user.id,
        page_id=None,
        content="Needs page before posting",
        status="draft",
    )
    test_db.add(draft)
    test_db.commit()
    test_db.refresh(draft)

    response = client.post(f"/api/v1/posting/from-draft/{draft.id}", headers=auth_headers(test_user))

    assert response.status_code == 400
    assert response.json()["detail"] == "Select a Facebook page before posting this draft"


def test_generate_draft_content(client, test_user, test_product, test_content_library, auth_headers):
    with override_ai_settings(ai_provider="mock", ai_model="mock-v1", image_provider="mock"):
        response = client.post(
            "/api/v1/drafts/generate",
            json={
                "product_id": test_product.id,
                "content_library_id": test_content_library.id,
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["content"].startswith("[mock/mock-v1]")
    assert data["media_url"].startswith("data:image/")


def test_generate_draft_image(client, test_user, test_product, test_content_library, auth_headers):
    with override_ai_settings(ai_provider="mock", image_provider="mock"):
        response = client.post(
            "/api/v1/drafts/generate-image",
            json={
                "product_id": test_product.id,
                "content_library_id": test_content_library.id,
                "style": "product showcase",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["content"]
    assert data["media_url"].startswith("data:image/")


def test_generate_draft_content_passes_compiled_prompt(monkeypatch, client, test_user, test_product, test_content_library, auth_headers):
    captured = {}

    def fake_generate_post_content(**kwargs):
        captured.update(kwargs)
        return AIGenerationResult(
            success=True,
            content="Generated from compiled prompt",
            provider="mock",
            model="mock-v1",
            usage={},
            provider_response={},
            error=None,
        )

    monkeypatch.setattr("app.services.ai.content_generator.generate_post_content", fake_generate_post_content)

    response = client.post(
        "/api/v1/drafts/generate",
        json={
            "product_id": test_product.id,
            "content_library_id": test_content_library.id,
            "tone": "friendly",
            "language": "en",
        },
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Generated from compiled prompt"
    assert "Zenvy" not in response.json()["content"]  # verify response is provider output
    assert "Test Product" in captured["prompt_override"]
    assert "Highlight the fastest onboarding path and strong CTA." in captured["prompt_override"]
    assert captured["tone"] == "friendly"


def test_generate_draft_image_uses_user_openai_image_key_instead_of_mock(monkeypatch, client, test_db, test_user, test_product, auth_headers):
    captured = {}

    class FakeImageProvider:
        def generate_image(self, prompt: str, model: str) -> str:
            captured["prompt"] = prompt
            captured["model"] = model
            return "https://example.com/generated.png"

    def fake_generate_content(**kwargs):
        return GeneratedContent(
            content="Generated post body",
            prompt="Compiled prompt for image generation",
            provider="mock",
            model="mock-v1",
            success=True,
            error=None,
        )

    def fake_get_image_provider(provider_name, api_key=None, base_url=None):
        captured["provider_name"] = provider_name
        captured["api_key"] = api_key
        return FakeImageProvider()

    from app.services.user_ai_key_service import UserAiKeyService

    UserAiKeyService(test_db).upsert_key(test_user, "openai", "sk-user-openai-image-1234")
    monkeypatch.setattr("app.api.routes.drafts.generate_content", fake_generate_content)
    monkeypatch.setattr("app.services.ai.image_generator.get_image_provider", fake_get_image_provider)

    with override_ai_settings(image_provider="mock", image_model="mock-image-v1", openai_api_key=None, image_api_key=None):
        response = client.post(
            "/api/v1/drafts/generate-image",
            json={
                "product_id": test_product.id,
                "ai_provider": "openai",
                "style": "product showcase",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    assert response.json()["media_url"] == "https://example.com/generated.png"
    assert captured["provider_name"] == "openai"
    assert captured["api_key"] == "sk-user-openai-image-1234"
    assert captured["model"] == "gpt-image-1"


def test_generate_draft_image_falls_back_to_system_openai_when_user_not_configured(monkeypatch, client, test_user, test_product, auth_headers):
    captured = {}

    class FakeImageProvider:
        def generate_image(self, prompt: str, model: str) -> str:
            captured["prompt"] = prompt
            captured["model"] = model
            return "https://example.com/system-generated.png"

    def fake_generate_content(**kwargs):
        return GeneratedContent(
            content="Generated post body",
            prompt="Compiled prompt for image generation",
            provider="mock",
            model="mock-v1",
            success=True,
            error=None,
        )

    def fake_get_image_provider(provider_name, api_key=None, base_url=None):
        captured["provider_name"] = provider_name
        captured["api_key"] = api_key
        return FakeImageProvider()

    monkeypatch.setattr("app.api.routes.drafts.generate_content", fake_generate_content)
    monkeypatch.setattr("app.services.ai.image_generator.get_image_provider", fake_get_image_provider)

    with override_ai_settings(
        image_provider="mock",
        image_model="mock-image-v1",
        openai_api_key="sk-system-openai-image-5678",
        image_api_key=None,
    ):
        response = client.post(
            "/api/v1/drafts/generate-image",
            json={
                "product_id": test_product.id,
                "ai_provider": "gemini",
                "style": "product showcase",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    assert response.json()["media_url"] == "https://example.com/system-generated.png"
    assert captured["provider_name"] == "openai"
    assert captured["api_key"] == "sk-system-openai-image-5678"
    assert captured["model"] == "gpt-image-1"


def test_generate_draft_image_uses_user_openai_key_even_when_text_ai_is_gemini(monkeypatch, client, test_db, test_user, test_product, auth_headers):
    captured = {}

    class FakeImageProvider:
        def generate_image(self, prompt: str, model: str) -> str:
            captured["model"] = model
            return "https://example.com/user-openai-image.png"

    def fake_generate_content(**kwargs):
        return GeneratedContent(
            content="Generated post body",
            prompt="Compiled prompt for image generation",
            provider="gemini",
            model="gemini-2.5-flash",
            success=True,
            error=None,
        )

    def fake_get_image_provider(provider_name, api_key=None, base_url=None):
        captured["provider_name"] = provider_name
        captured["api_key"] = api_key
        return FakeImageProvider()

    from app.services.user_ai_key_service import UserAiKeyService

    UserAiKeyService(test_db).upsert_key(test_user, "openai", "sk-user-openai-fallback-8888")
    monkeypatch.setattr("app.api.routes.drafts.generate_content", fake_generate_content)
    monkeypatch.setattr("app.services.ai.image_generator.get_image_provider", fake_get_image_provider)

    with override_ai_settings(image_provider="mock", image_model="mock-image-v1", openai_api_key=None, image_api_key=None):
        response = client.post(
            "/api/v1/drafts/generate-image",
            json={
                "product_id": test_product.id,
                "ai_provider": "gemini",
                "style": "product showcase",
            },
            headers=auth_headers(test_user),
        )

    assert response.status_code == 200
    assert response.json()["media_url"] == "https://example.com/user-openai-image.png"
    assert captured["provider_name"] == "openai"
    assert captured["api_key"] == "sk-user-openai-fallback-8888"
    assert captured["model"] == "gpt-image-1"
