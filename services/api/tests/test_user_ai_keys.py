from app.core.config import settings
from app.models.user_ai_api_key import UserAiApiKey
from app.services.ai_generation import generate_post_content
from app.services.ai_key_resolver import resolve_effective_api_key
from fastapi import HTTPException


def test_user_can_save_all_supported_provider_keys(client, test_db, test_user, auth_headers):
    headers = auth_headers(test_user)
    fixtures = {
        "openai": "sk-test-openai-1234",
        "gemini": "AIzaSyGeminiTest1234",
        "claude": "sk-ant-test-1234",
        "grok": "xai-test-1234",
    }

    for provider, api_key in fixtures.items():
        response = client.put(
            f"/api/v1/settings/ai-keys/{provider}",
            json={"api_key": api_key},
            headers=headers,
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["provider"] == provider
        assert payload["source"] == "user"
        assert payload["key_hint"]
        assert api_key not in str(payload)

    rows = test_db.query(UserAiApiKey).filter(UserAiApiKey.user_id == test_user.id).all()
    assert {row.provider for row in rows} == set(fixtures)


def test_stored_key_is_encrypted_and_not_returned_raw(client, test_db, test_user, auth_headers):
    raw_key = "sk-test-openai-raw-9876"
    response = client.put(
        "/api/v1/settings/ai-keys/openai",
        json={"api_key": raw_key},
        headers=auth_headers(test_user),
    )
    assert response.status_code == 200

    row = (
        test_db.query(UserAiApiKey)
        .filter(UserAiApiKey.user_id == test_user.id, UserAiApiKey.provider == "openai")
        .first()
    )
    assert row is not None
    assert row.encrypted_api_key != raw_key
    assert raw_key not in row.encrypted_api_key

    listing = client.get("/api/v1/settings/ai-keys", headers=auth_headers(test_user))
    assert listing.status_code == 200
    assert raw_key not in listing.text
    assert "sk-t...9876" in listing.text


def test_resolver_uses_user_key_first(test_db, test_user):
    original_openai = settings.openai_api_key
    settings.openai_api_key = "sk-env-openai-0000"
    try:
        row = UserAiApiKey(
            user_id=test_user.id,
            provider="openai",
            encrypted_api_key="",
            key_hint="",
            is_active=True,
            validation_status="unknown",
        )
        test_db.add(row)
        test_db.commit()
        from app.services.user_ai_key_service import UserAiKeyService

        service = UserAiKeyService(test_db)
        saved = service.upsert_key(test_user, "openai", "sk-user-openai-1234")
        resolved = resolve_effective_api_key(test_db, "openai", user=test_user)
        assert saved.id
        assert resolved.api_key == "sk-user-openai-1234"
        assert resolved.source == "user"
    finally:
        settings.openai_api_key = original_openai


def test_resolver_falls_back_to_env_when_user_key_missing(test_db, test_user):
    original_openai = settings.openai_api_key
    settings.openai_api_key = "sk-env-openai-9999"
    try:
        resolved = resolve_effective_api_key(test_db, "openai", user=test_user)
        assert resolved.api_key == "sk-env-openai-9999"
        assert resolved.source == "env"
    finally:
        settings.openai_api_key = original_openai


def test_resolver_errors_when_no_user_or_env_key(test_db, test_user):
    original_openai = settings.openai_api_key
    original_ai = settings.ai_api_key
    settings.openai_api_key = None
    settings.ai_api_key = None
    try:
        try:
            resolve_effective_api_key(test_db, "openai", user=test_user)
            assert False, "Expected resolver to fail when no key exists"
        except HTTPException as exc:
            assert "No OpenAI API key configured for this user" in exc.detail
    finally:
        settings.openai_api_key = original_openai
        settings.ai_api_key = original_ai


def test_user_cannot_access_another_users_key(client, test_db, test_user, admin_user, auth_headers):
    save_response = client.put(
        "/api/v1/settings/ai-keys/openai",
        json={"api_key": "sk-owner-1234"},
        headers=auth_headers(test_user),
    )
    assert save_response.status_code == 200

    listing = client.get("/api/v1/settings/ai-keys", headers=auth_headers(admin_user))
    assert listing.status_code == 200
    payload = listing.json()
    openai_item = next(item for item in payload["items"] if item["provider"] == "openai")
    assert openai_item["source"] != "user"
    assert openai_item["key_hint"] != "sk-o...1234"


def test_delete_user_key_works(client, test_db, test_user, auth_headers):
    headers = auth_headers(test_user)
    client.put("/api/v1/settings/ai-keys/openai", json={"api_key": "sk-delete-1234"}, headers=headers)

    delete_response = client.delete("/api/v1/settings/ai-keys/openai", headers=headers)
    assert delete_response.status_code == 200

    row = (
        test_db.query(UserAiApiKey)
        .filter(UserAiApiKey.user_id == test_user.id, UserAiApiKey.provider == "openai")
        .first()
    )
    assert row is None


def test_generation_service_uses_resolved_user_key(test_db, test_user, monkeypatch):
    captured = {}

    class FakeProvider:
        def generate_post_content(self, content_type, product_name, model, prompt=None, template_used=None):
            captured["content_type"] = content_type
            captured["product_name"] = product_name
            captured["model"] = model
            return type(
                "Result",
                (),
                {
                    "success": True,
                    "content": "Generated content",
                    "provider": "openai",
                    "model": model,
                    "usage": {},
                    "provider_response": {},
                    "error": None,
                },
            )()

    def fake_get_ai_provider(provider_name, api_key=None, base_url=None):
        captured["provider_name"] = provider_name
        captured["api_key"] = api_key
        return FakeProvider()

    from app.services.user_ai_key_service import UserAiKeyService
    import app.services.ai_generation as ai_generation_module

    UserAiKeyService(test_db).upsert_key(test_user, "openai", "sk-user-priority-1234")
    monkeypatch.setattr(ai_generation_module, "get_ai_provider", fake_get_ai_provider)

    result = generate_post_content(
        content_type="general_post",
        product_name="Widget",
        provider="openai",
        model="gpt-4o-mini",
        db=test_db,
        user=test_user,
    )

    assert result.success is True
    assert captured["api_key"] == "sk-user-priority-1234"


def test_generation_route_returns_clear_error_when_no_key_available(
    client,
    test_db,
    test_user,
    test_product,
    auth_headers,
):
    original_openai = settings.openai_api_key
    original_ai = settings.ai_api_key
    settings.openai_api_key = None
    settings.ai_api_key = None
    try:
        response = client.post(
            "/api/v1/drafts/generate",
            json={
                "product_id": test_product.id,
                "ai_provider": "openai",
                "ai_model": "gpt-4o-mini",
                "image_provider": "mock",
                "image_model": "mock-image-v1",
            },
            headers=auth_headers(test_user),
        )
        assert response.status_code == 400
        assert "No OpenAI API key configured for this user" in response.json()["detail"]
    finally:
        settings.openai_api_key = original_openai
        settings.ai_api_key = original_ai
