"""
Automated tests for ZenvyDesk AI Automation Workflow.
Tests the actual workflow: AutomationRule -> AutomationRunner -> AI Generation -> Draft -> PostHistory.
"""
import pytest

from app.models.draft import Draft
from app.models.post_history import PostHistory
from tests.helpers import create_automation_rule, override_ai_settings


def test_automation_mock_provider_success(client, test_db, test_user, test_page, test_product):
    """TEST 1: Mock provider success path."""
    rule = create_automation_rule(
        test_db,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Test Automation Rule",
        content_type="promotion",
    )

    with override_ai_settings(ai_provider="mock"):
        drafts_before = test_db.query(Draft).count()
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "draft_created"
        assert data["draft_id"] is not None
        assert data["provider"] == "mock"
        assert data["post_history_id"] is None

        drafts_after = test_db.query(Draft).count()
        assert drafts_after == drafts_before + 1

        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft is not None
        assert "mock" in draft.content.lower()
        assert "promotion" in draft.content.lower()
        assert test_product.name in draft.content

        print("\n✓ TEST 1 PASS: Mock provider success")
        print(f"  Draft ID: {draft.id}")
        print(f"  Content: {draft.content}")
        print(f"  Provider: {data['provider']}")


def test_automation_openai_missing_key_failure(client, test_db, test_user, test_page, test_product):
    """TEST 2: OpenAI provider with missing API key returns safe failure."""
    rule = create_automation_rule(
        test_db,
        user_id=test_user.id,
        page_id=test_page.id,
        name="OpenAI Test Rule",
        content_type="promotion",
    )

    with override_ai_settings(ai_provider="openai", ai_api_key=None):
        drafts_before = test_db.query(Draft).count()
        posts_before = test_db.query(PostHistory).count()
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "generation_failed"
        assert data["draft_id"] is None
        assert data["post_history_id"] is None
        assert data["error"] is not None
        assert "API_KEY" in data["error"] or "api_key" in data["error"].lower()

        drafts_after = test_db.query(Draft).count()
        posts_after = test_db.query(PostHistory).count()
        assert drafts_after == drafts_before
        assert posts_after == posts_before

        print("\n✓ TEST 2 PASS: OpenAI missing key failure handled safely")
        print(f"  Status: {data['status']}")
        print(f"  Error: {data['error']}")
        print(f"  Drafts before: {drafts_before}, after: {drafts_after}")
        print(f"  Posts before: {posts_before}, after: {posts_after}")


def test_automation_unknown_content_type_fallback(client, test_db, test_user, test_page, test_product):
    """TEST 3: Unknown content type falls back to the general prompt template."""
    rule = create_automation_rule(
        test_db,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Unknown Type Test Rule",
        content_type="unknown_type_xyz",
    )

    with override_ai_settings(ai_provider="mock"):
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "draft_created"
        assert data["draft_id"] is not None

        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft is not None
        assert draft.content is not None

        print("\n✓ TEST 3 PASS: Unknown content_type fallback worked")
        print("  Requested type: unknown_type_xyz")
        print(f"  Draft created: {draft.id}")
        print(f"  Content: {draft.content}")


def test_automation_auto_post_enabled(client, test_db, test_user, test_page, test_product):
    """TEST 4: Auto-post creates both Draft and PostHistory."""
    rule = create_automation_rule(
        test_db,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Auto Post Test Rule",
        content_type="engagement",
        auto_post=True,
    )

    with override_ai_settings(ai_provider="mock"):
        drafts_before = test_db.query(Draft).count()
        posts_before = test_db.query(PostHistory).count()
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "posted"
        assert data["draft_id"] is not None
        assert data["post_history_id"] is not None

        drafts_after = test_db.query(Draft).count()
        posts_after = test_db.query(PostHistory).count()
        assert drafts_after == drafts_before + 1
        assert posts_after == posts_before + 1

        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft.status == "posted"

        post = test_db.query(PostHistory).filter(PostHistory.id == data["post_history_id"]).first()
        assert post is not None
        assert post.draft_id == draft.id
        assert post.content == draft.content

        print("\n✓ TEST 4 PASS: Auto-post creates post_history")
        print(f"  Draft ID: {draft.id}, Status: {draft.status}")
        print(f"  PostHistory ID: {post.id}")
