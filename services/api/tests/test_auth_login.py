from app.models.user import User
from app.services.auth_service import hash_password


def test_login_me_logout_flow(client, test_db):
    user = User(
        id=1,
        username="demo",
        email="demo@zenvydesk.com",
        name="Demo User",
        password_hash=hash_password("123"),
    )
    test_db.add(user)
    test_db.commit()

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "demo", "password": "123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["token"]
    assert token

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["username"] == "demo"

    logout_response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_response.status_code == 200

    me_after_logout = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_after_logout.status_code == 401
