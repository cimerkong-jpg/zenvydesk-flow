"""
Automated tests for ZenvyDesk AI Automation Workflow.
Tests the actual workflow: AutomationRule -> AutomationRunner -> AI Generation -> Draft -> PostHistory.
"""
import pytest

from app.models.draft import Draft
from app.models.post_history import PostHistory
from tests.helpers import create_automation_rule, override_ai_settings


# TEST 1: Mock Provider Success
def test_automation_mock_provider_success(client, test_db, test_user, test_page, test_product):
    """
    TEST 1: Mock provider success path
    - Automation run succeeds
    - Draft is created
    - Generated content comes from mock provider
    """
    rule = create_automation_rule(
        test_db,
        rule_id=1,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Test Automation Rule",
        content_type="promotion",
    )

    with override_ai_settings(ai_provider="mock"):
        # Count drafts before
        drafts_before = test_db.query(Draft).count()
        
        # Run automation
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "draft_created"
        assert data["draft_id"] is not None
        assert data["provider"] == "mock"
        assert data["post_history_id"] is None  # auto_post=False
        
        # Count drafts after
        drafts_after = test_db.query(Draft).count()
        assert drafts_after == drafts_before + 1
        
        # Verify draft content
        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft is not None
        assert "mock" in draft.content.lower()
        assert "promotion" in draft.content.lower()
        assert test_product.name in draft.content
        
        print(f"\n✓ TEST 1 PASS: Mock provider success")
        print(f"  Draft ID: {draft.id}")
        print(f"  Content: {draft.content}")
        print(f"  Provider: {data['provider']}")
        


# TEST 2: OpenAI Missing Key Failure
def test_automation_openai_missing_key_failure(client, test_db, test_user, test_page, test_product):
    """
    TEST 2: OpenAI provider with missing API key
    - Returns structured failure
    - No draft created
    - No post_history created
    """
    rule = create_automation_rule(
        test_db,
        rule_id=2,
        user_id=test_user.id,
        page_id=test_page.id,
        name="OpenAI Test Rule",
        content_type="promotion",
    )

    with override_ai_settings(ai_provider="openai", ai_api_key=None):
        # Count records before
        drafts_before = test_db.query(Draft).count()
        posts_before = test_db.query(PostHistory).count()
        
        # Run automation
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "generation_failed"
        assert data["draft_id"] is None
        assert data["post_history_id"] is None
        assert data["error"] is not None
        assert "API_KEY" in data["error"] or "api_key" in data["error"].lower()
        
        # Verify no records created
        drafts_after = test_db.query(Draft).count()
        posts_after = test_db.query(PostHistory).count()
        
        assert drafts_after == drafts_before, "No draft should be created on failure"
        assert posts_after == posts_before, "No post_history should be created on failure"
        
        print(f"\n✓ TEST 2 PASS: OpenAI missing key failure handled safely")
        print(f"  Status: {data['status']}")
        print(f"  Error: {data['error']}")
        print(f"  Drafts before: {drafts_before}, after: {drafts_after}")
        print(f"  Posts before: {posts_before}, after: {posts_after}")
        


# TEST 3: Unknown Content Type Fallback
def test_automation_unknown_content_type_fallback(client, test_db, test_user, test_page, test_product):
    """
    TEST 3: Unknown content_type falls back to general_post
    - Prompt system uses fallback template
    - Generation still succeeds with mock
    """
    rule = create_automation_rule(
        test_db,
        rule_id=999,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Unknown Type Test Rule",
        content_type="unknown_type_xyz",
    )

    with override_ai_settings(ai_provider="mock"):
        # Run automation
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "draft_created"
        assert data["draft_id"] is not None
        
        # Verify draft was created (fallback worked)
        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft is not None
        assert draft.content is not None
        
        print(f"\n✓ TEST 3 PASS: Unknown content_type fallback worked")
        print(f"  Requested type: unknown_type_xyz")
        print(f"  Draft created: {draft.id}")
        print(f"  Content: {draft.content}")
        


# TEST 4: Auto-Post Enabled
def test_automation_auto_post_enabled(client, test_db, test_user, test_page, test_product):
    """
    TEST 4: Auto-post enabled creates post_history
    - Draft created
    - PostHistory created
    - Draft status updated to 'posted'
    """
    rule = create_automation_rule(
        test_db,
        rule_id=998,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Auto Post Test Rule",
        content_type="engagement",
        auto_post=True,
    )

    with override_ai_settings(ai_provider="mock"):
        # Count records before
        drafts_before = test_db.query(Draft).count()
        posts_before = test_db.query(PostHistory).count()
        
        # Run automation
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "posted"
        assert data["draft_id"] is not None
        assert data["post_history_id"] is not None
        
        # Verify records created
        drafts_after = test_db.query(Draft).count()
        posts_after = test_db.query(PostHistory).count()
        
        assert drafts_after == drafts_before + 1
        assert posts_after == posts_before + 1
        
        # Verify draft status
        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft.status == "posted"
        
        # Verify post_history
        post = test_db.query(PostHistory).filter(PostHistory.id == data["post_history_id"]).first()
        assert post is not None
        assert post.draft_id == draft.id
        assert post.content == draft.content
        
        print(f"\n✓ TEST 4 PASS: Auto-post creates post_history")
        print(f"  Draft ID: {draft.id}, Status: {draft.status}")
        print(f"  PostHistory ID: {post.id}")
        
