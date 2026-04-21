"""
Tests for AI output validation and sanitization.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.automation_runner import run_automation
from app.core.config import settings
from app.core.database import Base
from app.models.automation_rule import AutomationRule
from app.models.draft import Draft
from app.models.facebook_page import FacebookPage
from app.models.post_history import PostHistory
from app.models.product import Product
from app.models.user import User
from app.services.ai_providers.openai_provider import OpenAIProvider
from app.services.ai_generation import generate_post_content
from app.services.ai_providers.types import AIGenerationResult


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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


@pytest.fixture(scope="function")
def test_db():
    """Provide a clean test database session for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(test_db):
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_page(test_db, test_user):
    page = FacebookPage(id=1, user_id=test_user.id, page_id="987654321", page_name="Test Page", access_token="test_token")
    test_db.add(page)
    test_db.commit()
    test_db.refresh(page)
    return page


@pytest.fixture
def test_product(test_db, test_user):
    product = Product(id=1, user_id=test_user.id, name="Test Product", description="A test product", price=99.99)
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)
    return product


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
    prompt = "Compiled prompt for Zenvy Flow."
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


def test_automation_flow_blocks_invalid_output_persistence(monkeypatch, test_db, test_user, test_page, test_product):
    rule = AutomationRule(
        id=7,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Validation Failure Rule",
        content_type="promotion",
        auto_post=True,
        scheduled_time="daily",
        is_active=True,
    )
    test_db.add(rule)
    test_db.commit()

    provider = FakeProvider("Generate a social media post.\nRequirements:\n- Be clear and engaging")
    monkeypatch.setattr("app.services.ai_generation.get_ai_provider", lambda **kwargs: provider)

    original_provider = settings.ai_provider
    settings.ai_provider = "mock"

    try:
        data = run_automation(rule.id, db=test_db)
    finally:
        settings.ai_provider = original_provider

    assert data["status"] == "generation_failed"
    assert data["draft_id"] is None
    assert data["post_history_id"] is None
    assert "validation failed" in data["error"].lower()
    assert test_db.query(Draft).count() == 0
    assert test_db.query(PostHistory).count() == 0
