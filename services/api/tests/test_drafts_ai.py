from app.services.ai_providers.types import AIGenerationResult

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
    with override_ai_settings(ai_provider="mock", image_provider="mock"):
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
