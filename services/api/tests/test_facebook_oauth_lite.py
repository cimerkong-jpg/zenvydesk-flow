import asyncio

from app.services.facebook_oauth_lite import FacebookOAuthLite


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        self.calls = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url, params=None):
        self.calls += 1
        if self.calls == 1:
            return FakeResponse(
                {
                    "data": [{"id": "page_1", "name": "Page One", "access_token": "token_1"}],
                    "paging": {"next": "https://graph.facebook.com/v18.0/me/accounts?after=cursor"},
                }
            )
        return FakeResponse(
            {
                "data": [{"id": "page_2", "name": "Page Two", "access_token": "token_2"}],
                "paging": {},
            }
        )


def test_fetch_managed_pages_follows_pagination(monkeypatch):
    monkeypatch.setattr("app.services.facebook_oauth_lite.httpx.AsyncClient", FakeAsyncClient)

    oauth = FacebookOAuthLite()
    pages = asyncio.run(oauth.fetch_managed_pages("user_token"))

    assert len(pages) == 2
    assert pages[0]["id"] == "page_1"
    assert pages[1]["id"] == "page_2"
