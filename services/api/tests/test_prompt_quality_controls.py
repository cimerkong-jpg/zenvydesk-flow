"""
Tests for prompt quality controls and GPT/OpenAI prompt formatting.
"""

from app.services.prompt_builder import PromptBuilder, PromptContext
from app.services.ai_providers.openai_provider import OpenAIProvider


def test_supported_tone_presets_are_exposed():
    assert PromptBuilder.get_supported_tone_presets() == [
        "friendly",
        "professional",
        "urgent",
        "playful",
    ]


def test_supported_length_presets_are_exposed():
    assert PromptBuilder.get_supported_length_presets() == ["short", "medium", "long"]


def test_supported_emoji_presets_are_exposed():
    assert PromptBuilder.get_supported_emoji_presets() == ["none", "light", "moderate"]


def test_prompt_builder_applies_supported_quality_presets():
    context = PromptContext(
        product_name="Zenvy Flow",
        product_description="An automation workspace for lean teams.",
        selling_points=["Fast setup", "Shared workflows"],
        tone="urgent",
        output_length="short",
        emoji_level="moderate",
        target_audience="Operations teams at growing startups",
        cta="Start your free trial today.",
    )

    prompt, template_used = PromptBuilder.build_prompt("promotion", context)

    assert template_used == "promotion"
    assert "Tone preset (urgent)" in prompt
    assert "Output length (short)" in prompt
    assert "Emoji use (moderate)" in prompt
    assert 'CTA: Include this call to action naturally if it fits: "Start your free trial today."' in prompt
    assert "Target Audience: Operations teams at growing startups" in prompt


def test_prompt_builder_uses_fallback_presets():
    context = PromptContext(
        product_name="Zenvy Flow",
        tone="unsupported-tone",
        output_length="unsupported-length",
        emoji_level="unsupported-emoji",
    )

    prompt, template_used = PromptBuilder.build_prompt("unknown_type", context)

    assert template_used == "general_post"
    assert "Tone preset (friendly)" in prompt
    assert "Output length (medium)" in prompt
    assert "Emoji use (light)" in prompt


def test_cta_is_optional_when_missing():
    context = PromptContext(product_name="Zenvy Flow")

    prompt, _ = PromptBuilder.build_prompt("general_post", context)

    assert "CTA: Do not force a call to action if one is not provided." in prompt


def test_cta_is_included_naturally_when_provided():
    context = PromptContext(
        product_name="Zenvy Flow",
        cta="Start your free trial today.",
    )

    prompt, _ = PromptBuilder.build_prompt("promotion", context)

    assert 'CTA: Include this call to action naturally if it fits: "Start your free trial today."' in prompt


def test_openai_provider_uses_compiled_prompt(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [{"message": {"content": "Generated post"}}],
                "usage": {"prompt_tokens": 12, "completion_tokens": 24, "total_tokens": 36},
            }

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("app.services.ai_providers.openai_provider.requests.post", fake_post)

    provider = OpenAIProvider(api_key="test-key")
    prompt = "Compiled prompt with tone and emoji controls."
    result = provider.generate_post_content(
        content_type="promotion",
        product_name="Zenvy Flow",
        model="gpt-4o-mini",
        prompt=prompt,
        template_used="promotion",
    )

    assert result.success is True
    assert captured["url"] == "https://api.openai.com/v1/chat/completions"
    assert captured["json"]["messages"][1]["content"] == prompt
    assert captured["json"]["max_tokens"] == 300
