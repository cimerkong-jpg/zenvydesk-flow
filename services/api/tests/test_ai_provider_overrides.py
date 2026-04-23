from app.services.ai_generation import generate_post_content
from app.services.ai_providers.types import AIGenerationResult


def test_generate_post_content_uses_request_level_provider_overrides(monkeypatch):
    captured = {}

    class FakeProvider:
        def generate_post_content(self, content_type, product_name, model, prompt=None, template_used=None):
            captured["model"] = model
            captured["prompt"] = prompt
            return AIGenerationResult(
                success=True,
                content="Override content",
                provider="gemini",
                model=model,
                usage={},
                provider_response={},
                error=None,
            )

    def fake_get_ai_provider(provider_name, api_key=None, base_url=None):
        captured["provider_name"] = provider_name
        captured["api_key"] = api_key
        captured["base_url"] = base_url
        return FakeProvider()

    monkeypatch.setattr("app.services.ai_generation.get_ai_provider", fake_get_ai_provider)
    monkeypatch.setattr(
        "app.services.ai_generation.GPTManagerService.create_plan",
        lambda self, **kwargs: __import__("app.services.ai.manager", fromlist=["TextGenerationPlan"]).TextGenerationPlan(
            objective="general",
            tone="marketing",
            audience="general audience",
            hook_style="Short, attention-grabbing first line",
            cta_style="Clear CTA",
            content_constraints=["Return only the final post text."],
            execution_prompt="Manager execution prompt based on Custom prompt",
        ),
    )

    result = generate_post_content(
        content_type="general_post",
        product_name="Test Product",
        provider="gemini",
        model="gemini-2.5-flash",
        api_key="gemini-secret",
        base_url="https://example.ai",
        prompt_override="Custom prompt",
    )

    assert result.success is True
    assert captured["provider_name"] == "gemini"
    assert captured["api_key"] == "gemini-secret"
    assert captured["base_url"] == "https://example.ai"
    assert captured["model"] == "gemini-2.5-flash"
    assert "Custom prompt" in captured["prompt"]
