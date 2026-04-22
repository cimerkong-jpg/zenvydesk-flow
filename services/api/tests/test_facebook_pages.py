from app.core.config import settings
from app.models.draft import Draft
from app.models.facebook_page import FacebookPage


def test_get_facebook_pages_returns_status_and_selection(client, test_db, test_user):
    selected_page = FacebookPage(
        user_id=test_user.id,
        page_id="page_selected",
        page_name="Selected Page",
        access_token="selected_token",
        is_active=True,
        is_selected=True,
    )
    reconnect_page = FacebookPage(
        user_id=test_user.id,
        page_id="page_reconnect",
        page_name="Reconnect Page",
        access_token=None,
        is_active=False,
        is_selected=False,
    )
    test_db.add_all([selected_page, reconnect_page])
    test_db.commit()

    response = client.get("/api/v1/facebook/pages")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["page_id"] == "page_selected"
    assert data[0]["is_selected"] is True
    assert data[0]["has_access_token"] is True
    assert data[0]["connection_status"] == "connected"
    assert data[1]["page_id"] == "page_reconnect"
    assert data[1]["connection_status"] == "needs_reconnect"


def test_select_facebook_page_persists_selection(client, test_db, test_user):
    page_one = FacebookPage(
        user_id=test_user.id,
        page_id="page_one",
        page_name="Page One",
        access_token="token_one",
        is_selected=True,
    )
    page_two = FacebookPage(
        user_id=test_user.id,
        page_id="page_two",
        page_name="Page Two",
        access_token="token_two",
        is_selected=False,
    )
    test_db.add_all([page_one, page_two])
    test_db.commit()

    response = client.post("/api/v1/facebook/pages/select/page_two")

    assert response.status_code == 200
    assert response.json()["page_id"] == "page_two"
    test_db.refresh(page_one)
    test_db.refresh(page_two)
    assert page_one.is_selected is False
    assert page_two.is_selected is True


def test_facebook_login_redirects_with_missing_config(client, monkeypatch):
    original_app_id = settings.facebook_app_id
    original_redirect = settings.facebook_redirect_uri
    settings.facebook_app_id = None
    settings.facebook_redirect_uri = ""

    try:
        response = client.get("/api/v1/auth/facebook/login", follow_redirects=False)
    finally:
        settings.facebook_app_id = original_app_id
        settings.facebook_redirect_uri = original_redirect

    assert response.status_code in (302, 307)
    assert "fb_error=missing_oauth_config" in response.headers["location"]


def test_facebook_login_redirects_to_staging_frontend_for_staging_env(client):
    original_app_id = settings.facebook_app_id
    original_redirect = settings.facebook_redirect_uri
    original_frontend = settings.frontend_base_url
    original_app_env = settings.app_env
    original_app_base_url = settings.app_base_url
    settings.facebook_app_id = None
    settings.facebook_redirect_uri = ""
    settings.frontend_base_url = None
    settings.app_env = "staging"
    settings.app_base_url = "https://zenvydesk-api-staging.onrender.com"

    try:
        response = client.get("/api/v1/auth/facebook/login", follow_redirects=False)
    finally:
        settings.facebook_app_id = original_app_id
        settings.facebook_redirect_uri = original_redirect
        settings.frontend_base_url = original_frontend
        settings.app_env = original_app_env
        settings.app_base_url = original_app_base_url

    assert response.status_code in (302, 307)
    assert response.headers["location"].startswith("https://zenvydesk-staging.onrender.com/")


def test_facebook_login_redirects_to_production_frontend_for_production_env(client):
    original_app_id = settings.facebook_app_id
    original_redirect = settings.facebook_redirect_uri
    original_frontend = settings.frontend_base_url
    original_app_env = settings.app_env
    original_app_base_url = settings.app_base_url
    settings.facebook_app_id = None
    settings.facebook_redirect_uri = ""
    settings.frontend_base_url = None
    settings.app_env = "production"
    settings.app_base_url = "https://api.zenvydesk.site"

    try:
        response = client.get("/api/v1/auth/facebook/login", follow_redirects=False)
    finally:
        settings.facebook_app_id = original_app_id
        settings.facebook_redirect_uri = original_redirect
        settings.frontend_base_url = original_frontend
        settings.app_env = original_app_env
        settings.app_base_url = original_app_base_url

    assert response.status_code in (302, 307)
    assert response.headers["location"].startswith("https://zenvydesk.site/")


def test_facebook_callback_saves_all_pages(client, test_db, monkeypatch):
    async def fake_exchange_code_for_token(self, code: str):
        return "user_token"

    async def fake_fetch_managed_pages(self, access_token: str):
        return [
            {"id": "page_1", "name": "Page One", "access_token": "token_1"},
            {"id": "page_2", "name": "Page Two", "access_token": "token_2"},
        ]

    monkeypatch.setattr(
        "app.services.facebook_oauth_lite.FacebookOAuthLite.exchange_code_for_token",
        fake_exchange_code_for_token,
    )
    monkeypatch.setattr(
        "app.services.facebook_oauth_lite.FacebookOAuthLite.fetch_managed_pages",
        fake_fetch_managed_pages,
    )

    response = client.get("/api/v1/auth/facebook/callback?code=test-code", follow_redirects=False)

    assert response.status_code in (302, 307)
    assert "fb_connected=1" in response.headers["location"]
    saved_pages = test_db.query(FacebookPage).order_by(FacebookPage.page_id.asc()).all()
    assert len(saved_pages) == 2
    assert any(page.is_selected for page in saved_pages)
    assert all(page.is_active for page in saved_pages)


def test_post_from_draft_uses_selected_page_and_creates_history(client, test_db, test_user):
    page = FacebookPage(
        user_id=test_user.id,
        page_id="test_page_123",
        page_name="Selected Page",
        access_token="token_123",
        is_selected=True,
    )
    draft = Draft(
        user_id=test_user.id,
        page_id=None,
        content="Post this through selected page",
        status="draft",
    )
    test_db.add(page)
    test_db.add(draft)
    test_db.commit()
    test_db.refresh(draft)

    response = client.post(f"/api/v1/posting/from-draft/{draft.id}?mock_mode=true")

    assert response.status_code == 200
    data = response.json()
    assert data["draft_id"] == draft.id
    assert data["page_id"] == page.id
    assert data["post_status"] == "success"
    test_db.refresh(draft)
    assert draft.page_id == page.id
    assert draft.status == "posted"
