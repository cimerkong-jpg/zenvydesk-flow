from app.models.draft import Draft
from app.models.post_history import PostHistory
from tests.helpers import create_automation_rule, override_ai_settings


def test_automation_creates_draft_with_selected_assets(
    client,
    test_db,
    test_user,
    test_page,
    test_product,
    test_content_library,
):
    rule = create_automation_rule(
        test_db,
        user_id=test_user.id,
        page_id=test_page.id,
        product_id=test_product.id,
        content_library_id=test_content_library.id,
        name="Automation with product and library",
        content_type="promotion",
        tone="friendly",
        language="en",
        style="product showcase",
    )

    with override_ai_settings(ai_provider="mock", image_provider="mock"):
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "draft_created"
    assert data["draft_id"] is not None
    assert data["provider"] == "service-layer"

    draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
    assert draft is not None
    assert draft.product_id == test_product.id
    assert draft.content_library_id == test_content_library.id
    assert test_product.name in draft.content
    assert draft.media_url.startswith("data:image/")


def test_automation_auto_post_creates_post_history(client, test_db, test_user, test_page, test_product):
    rule = create_automation_rule(
        test_db,
        user_id=test_user.id,
        page_id=test_page.id,
        product_id=test_product.id,
        name="Auto-post rule",
        content_type="engagement",
        auto_post=True,
    )

    with override_ai_settings(ai_provider="mock", image_provider="mock"):
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "posted"
    assert data["post_history_id"] is not None

    draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
    post = test_db.query(PostHistory).filter(PostHistory.id == data["post_history_id"]).first()
    assert draft is not None
    assert post is not None
    assert draft.status == "posted"
    assert post.draft_id == draft.id
    assert post.post_status == "success"


def test_automation_uses_fallback_when_provider_missing_key(client, test_db, test_user, test_page, test_product):
    rule = create_automation_rule(
        test_db,
        user_id=test_user.id,
        page_id=test_page.id,
        product_id=test_product.id,
        name="Fallback rule",
        content_type="promotion",
    )

    with override_ai_settings(ai_provider="openai", ai_api_key=None, openai_api_key=None, image_provider="mock"):
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "draft_created"

    draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
    assert draft is not None
    assert "Generated content preview for manual editing." in draft.content
