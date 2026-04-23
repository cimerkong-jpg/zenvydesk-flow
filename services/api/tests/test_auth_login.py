from app.models.refresh_token import RefreshToken
from app.models.user import User


def test_register_success(client, test_db):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@example.com",
            "password": "StrongPass123!",
            "full_name": "New User",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["email"] == "new@example.com"
    assert payload["user"]["role"] == "member"
    assert payload["access_token"]
    assert payload["refresh_token"]


def test_register_duplicate_email_rejected(client, test_user):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_user.email,
            "password": "StrongPass123!",
            "full_name": "Duplicate",
        },
    )
    assert response.status_code == 400


def test_login_me_logout_refresh_flow(client, test_db, test_user):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "Member123!"},
    )
    assert login_response.status_code == 200

    payload = login_response.json()
    access_token = payload["access_token"]
    refresh_token = payload["refresh_token"]

    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == test_user.email

    refresh_response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_response.status_code == 200
    new_access_token = refresh_response.json()["access_token"]
    assert new_access_token != access_token

    logout_response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_response.json()["refresh_token"]},
        headers={"Authorization": f"Bearer {new_access_token}"},
    )
    assert logout_response.status_code == 200

    revoked_tokens = test_db.query(RefreshToken).filter(RefreshToken.user_id == test_user.id).all()
    assert any(token.revoked_at is not None for token in revoked_tokens)


def test_login_wrong_password_rejected(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "wrong"},
    )
    assert response.status_code == 401


def test_login_suspended_user_rejected(client, test_user, test_db):
    test_user.status = "suspended"
    test_db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "Member123!"},
    )
    assert response.status_code == 403


def test_forgot_and_reset_password_flow(client, test_user):
    forgot_response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": test_user.email},
    )
    assert forgot_response.status_code == 200
    reset_token = forgot_response.json()["reset_token"]
    assert reset_token

    reset_response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "NewMember123!"},
    )
    assert reset_response.status_code == 200

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "NewMember123!"},
    )
    assert login_response.status_code == 200


def test_change_password_requires_current_password(client, test_user):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "Member123!"},
    )
    access_token = login_response.json()["access_token"]

    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Member123!", "new_password": "Updated123!"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200

    relogin = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "Updated123!"},
    )
    assert relogin.status_code == 200
