from app.models.facebook_page import FacebookPage
from app.models.oauth_identity import OAuthIdentity
from app.models.user import User


def test_unauthenticated_user_cannot_start_connect_flow(client):
    response = client.get("/api/v1/connections/facebook/start")
    assert response.status_code == 401


def test_authenticated_user_can_start_connect_flow(client, test_user, auth_headers):
    response = client.get("/api/v1/connections/facebook/start", headers=auth_headers(test_user))
    assert response.status_code == 400 or response.status_code == 200


def test_get_pages_returns_demo_page_when_no_real_connection(client, test_user, auth_headers):
    response = client.get("/api/v1/connections/facebook/pages", headers=auth_headers(test_user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["connected"] is False
    assert len(payload["pages"]) == 1
    assert payload["pages"][0]["connection_status"] == "demo"
    assert payload["pages"][0]["is_selected"] is True
    assert payload["pages"][0]["facebook_page_id"].startswith("demo-page-")


def test_callback_stores_identity_and_pages_for_existing_user(client, test_db, test_user, auth_headers, monkeypatch):
    start = client.get("/api/v1/connections/facebook/start", headers=auth_headers(test_user))
    if start.status_code == 400:
        from app.core.config import settings

        settings.facebook_app_id = "app-id"
        settings.facebook_redirect_uri = "http://testserver/api/v1/connections/facebook/callback"
        start = client.get("/api/v1/connections/facebook/start", headers=auth_headers(test_user))
    state = start.json()["state"]

    async def fake_exchange_code_for_token_payload(self, code: str):
        return {"access_token": "user_token", "token_type": "bearer", "expires_in": 3600}

    async def fake_fetch_user_profile(self, access_token: str):
        return {"id": "fb-user-1", "email": "fb@example.com"}

    async def fake_fetch_managed_pages(self, access_token: str):
        return [
            {"id": "page_1", "name": "Page One", "access_token": "token_1"},
            {"id": "page_2", "name": "Page Two", "access_token": "token_2"},
        ]

    monkeypatch.setattr(
        "app.services.facebook_oauth_lite.FacebookOAuthLite.exchange_code_for_token_payload",
        fake_exchange_code_for_token_payload,
    )
    monkeypatch.setattr(
        "app.services.facebook_oauth_lite.FacebookOAuthLite.fetch_user_profile",
        fake_fetch_user_profile,
    )
    monkeypatch.setattr(
        "app.services.facebook_oauth_lite.FacebookOAuthLite.fetch_managed_pages",
        fake_fetch_managed_pages,
    )

    response = client.get(
        f"/api/v1/connections/facebook/callback?state={state}&code=test-code",
        follow_redirects=False,
    )

    assert response.status_code in (302, 307)
    assert "fb_connected=1" in response.headers["location"]

    identity = test_db.query(OAuthIdentity).filter(OAuthIdentity.user_id == test_user.id).one()
    assert identity.provider_user_id == "fb-user-1"
    saved_pages = test_db.query(FacebookPage).filter(FacebookPage.user_id == test_user.id).all()
    assert len(saved_pages) == 2
    assert all(page.user_id == test_user.id for page in saved_pages)
    assert test_db.query(User).count() == 1


def test_select_page_works_only_for_owner_user(client, test_db, test_user, admin_user, auth_headers):
    page = FacebookPage(
        user_id=test_user.id,
        page_id="owned-page",
        page_name="Owned Page",
        access_token="token",
        is_selected=False,
    )
    test_db.add(page)
    test_db.commit()

    forbidden = client.post(
        "/api/v1/connections/facebook/select-page",
        headers=auth_headers(admin_user),
        json={"facebook_page_id": "owned-page"},
    )
    assert forbidden.status_code == 404

    allowed = client.post(
        "/api/v1/connections/facebook/select-page",
        headers=auth_headers(test_user),
        json={"facebook_page_id": "owned-page"},
    )
    assert allowed.status_code == 200
    assert allowed.json()["is_selected"] is True


def test_disconnect_restores_demo_page_when_real_pages_become_inactive(client, test_db, test_user, auth_headers):
    page = FacebookPage(
        user_id=test_user.id,
        page_id="real-page",
        page_name="Real Page",
        access_token="token",
        is_active=True,
        is_selected=True,
    )
    identity = OAuthIdentity(
        user_id=test_user.id,
        provider="facebook",
        provider_user_id="fb-real-user",
    )
    test_db.add(page)
    test_db.add(identity)
    test_db.commit()

    response = client.post("/api/v1/connections/facebook/disconnect", headers=auth_headers(test_user))
    assert response.status_code == 200

    pages_response = client.get("/api/v1/connections/facebook/pages", headers=auth_headers(test_user))
    assert pages_response.status_code == 200
    payload = pages_response.json()
    demo_pages = [page for page in payload["pages"] if page["connection_status"] == "demo"]
    assert len(demo_pages) == 1
    assert demo_pages[0]["is_selected"] is True
