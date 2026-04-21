from app.models.facebook_page import FacebookPage


def test_get_facebook_pages_returns_active_pages_only(client, test_db, test_user):
    active_page = FacebookPage(
        user_id=test_user.id,
        page_id="page_active_1",
        page_name="Active Page",
        access_token="active_token",
        is_active=True,
    )
    inactive_page = FacebookPage(
        user_id=test_user.id,
        page_id="page_inactive_1",
        page_name="Inactive Page",
        access_token="inactive_token",
        is_active=False,
    )
    test_db.add_all([active_page, inactive_page])
    test_db.commit()

    response = client.get("/api/v1/facebook/pages")

    assert response.status_code == 200
    assert response.json() == [
        {
            "page_id": "page_active_1",
            "page_name": "Active Page",
            "is_active": True,
        }
    ]
