"""
Tests for AI output validation and sanitization.
"""

import pytest

from app.api.routes.automation_runner import run_automation
from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.services.ai_generation import generate_post_content
from app.services.ai_providers.openai_provider import OpenAIProvider
from app.services.ai_providers.types import AIGenerationResult
from tests.helpers import create_automation_rule, override_ai_settings


class FakeProvider:
    """Minimal provider stub for output validation tests."""

    def __init__(self, content: str, provider: str = "mock", model: str = "test-model"):
        self.content = content
        self.provider = provider
        self.model = model

    def generate_post_content(self, content_type: str, product_name: str, model: str, prompt: str = None, template_used: str = None):
        return AIGenerationResult(
            success=True,
            content=self.content,
            provider=self.provider,
            model=model,
            usage={"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
            provider_response={"template_used": template_used, "prompt": prompt},
            error=None,
        )


def test_valid_ai_output_is_cleaned_and_accepted(monkeypatch):
    provider = FakeProvider("  Launch faster with Zenvy Flow.\n\n\nKeep shared workflows clear.  ")
    monkeypatch.setattr("app.services.ai_generation.get_ai_provider", lambda **kwargs: provider)

    result = generate_post_content(content_type="promotion", product_name="Zenvy Flow", provider="mock", model="test-model")

    assert result.success is True
    assert result.content == "Launch faster with Zenvy Flow.\n\nKeep shared workflows clear."


def test_whitespace_output_is_rejected_safely(monkeypatch):
    provider = FakeProvider("   \n\t  ")
    monkeypatch.setattr("app.services.ai_generation.get_ai_provider", lambda **kwargs: provider)

    result = generate_post_content(content_type="promotion", product_name="Zenvy Flow", provider="mock", model="test-model")

    assert result.success is False
    assert result.content is None
    assert result.error == "AI output validation failed: AI output is empty or whitespace-only"


def test_meta_output_is_cleaned_safely(monkeypatch):
    provider = FakeProvider("Certainly! Here's a post:  Launch faster with Zenvy Flow today.")
    monkeypatch.setattr("app.services.ai_generation.get_ai_provider", lambda **kwargs: provider)

    result = generate_post_content(content_type="promotion", product_name="Zenvy Flow", provider="mock", model="test-model")

    assert result.success is True
    assert result.content == "Launch faster with Zenvy Flow today."


def test_openai_provider_accepts_compiled_prompt(monkeypatch):
    """Verify the OpenAI provider builds the expected prompt on the main baseline."""
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [{"message": {"content": "Launch faster with Zenvy Flow today."}}],
                "usage": {"prompt_tokens": 12, "completion_tokens": 16, "total_tokens": 28},
            }

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("app.services.ai_providers.openai_provider.requests.post", fake_post)

    provider = OpenAIProvider(api_key="test-key")
    result = provider.generate_post_content(
        content_type="promotion",
        product_name="Zenvy Flow",
        model="gpt-4o-mini",
    )

    assert result.success is True
    assert captured["url"] == "https://api.openai.com/v1/chat/completions"
    assert "promotion" in captured["json"]["messages"][1]["content"].lower()
    assert "Zenvy Flow" in captured["json"]["messages"][1]["content"]


def test_automation_flow_blocks_invalid_output_persistence(monkeypatch, test_db, test_user, test_page, test_product):
    rule = create_automation_rule(
        test_db,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Validation Failure Rule",
        content_type="promotion",
        auto_post=True,
    )

    provider = FakeProvider("Generate a social media post.\nRequirements:\n- Be clear and engaging")
    monkeypatch.setattr("app.services.ai_generation.get_ai_provider", lambda **kwargs: provider)

    with override_ai_settings(ai_provider="mock"):
        data = run_automation(rule.id, db=test_db)

    assert data["status"] == "generation_failed"
    assert data["draft_id"] is None
    assert data["post_history_id"] is None
    assert "validation failed" in data["error"].lower()
    assert test_db.query(Draft).count() == 0
    assert test_db.query(PostHistory).count() == 0
