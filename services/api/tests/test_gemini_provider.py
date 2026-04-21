"""
Tests for Gemini Provider Integration
Verifies Gemini provider works correctly and doesn't break existing providers
"""
import pytest

from app.models.draft import Draft
from app.models.post_history import PostHistory
from tests.helpers import create_automation_rule, override_ai_settings


# TEST 1: Mock Provider Regression
def test_mock_provider_still_works(client, test_db, test_user, test_page, test_product):
    """
    TEST 1: Verify mock provider still works after adding Gemini
    """
    rule = create_automation_rule(
        test_db,
        rule_id=1,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Mock Test Rule",
        content_type="promotion",
    )

    with override_ai_settings(ai_provider="mock"):
        drafts_before = test_db.query(Draft).count()
        
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "draft_created"
        assert data["provider"] == "mock"
        assert data["draft_id"] is not None
        
        drafts_after = test_db.query(Draft).count()
        assert drafts_after == drafts_before + 1
        
        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert "mock" in draft.content.lower()
        
        print(f"\n✓ TEST 1 PASS: Mock provider regression test")
        print(f"  Provider: {data['provider']}")
        print(f"  Draft ID: {draft.id}")
        print(f"  Content: {draft.content}")
        


# TEST 2: Gemini Missing Key Failure
def test_gemini_missing_key_safe_failure(client, test_db, test_user, test_page, test_product):
    """
    TEST 2: Gemini with missing API key fails safely
    """
    rule = create_automation_rule(
        test_db,
        rule_id=2,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Gemini Missing Key Test",
        content_type="engagement",
    )

    with override_ai_settings(ai_provider="gemini", ai_api_key=None):
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
        
        assert drafts_after == drafts_before, "No draft should be created"
        assert posts_after == posts_before, "No post_history should be created"
        
        print(f"\n✓ TEST 2 PASS: Gemini missing key safe failure")
        print(f"  Status: {data['status']}")
        print(f"  Error: {data['error']}")
        print(f"  Drafts before: {drafts_before}, after: {drafts_after}")
        print(f"  Posts before: {posts_before}, after: {posts_after}")
        


# TEST 3: Gemini Provider Wiring
def test_gemini_provider_wiring(client, test_db, test_user, test_page, test_product):
    """
    TEST 3: Gemini provider selection and wiring
    """
    rule = create_automation_rule(
        test_db,
        rule_id=3,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Gemini Wiring Test",
        content_type="product_intro",
    )

    with override_ai_settings(ai_provider="gemini", ai_api_key="test_fake_key_for_wiring_test"):
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # With fake key, should fail at API call but provider should be selected
        assert data["provider"] == "gemini"
        assert data["status"] == "generation_failed"
        assert "Gemini" in data["error"] or "gemini" in data["error"].lower()
        
        print(f"\n✓ TEST 3 PASS: Gemini provider wiring verified")
        print(f"  Provider selected: {data['provider']}")
        print(f"  Status: {data['status']}")
        print(f"  Error (expected API failure): {data['error']}")
        
