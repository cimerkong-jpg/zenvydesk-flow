from app.models.user import User


def test_admin_can_list_users(client, admin_user, test_user, auth_headers):
    response = client.get("/api/v1/admin/users/", headers=auth_headers(admin_user))
    assert response.status_code == 200
    assert response.json()["total"] >= 2


def test_member_cannot_access_admin_routes(client, test_user, auth_headers):
    response = client.get("/api/v1/admin/users/", headers=auth_headers(test_user))
    assert response.status_code == 403


def test_admin_can_create_user(client, admin_user, auth_headers):
    response = client.post(
        "/api/v1/admin/users/",
        headers=auth_headers(admin_user),
        json={
            "email": "staff@example.com",
            "password": "StaffPass123!",
            "full_name": "Staff User",
            "role": "member",
            "status": "active",
        },
    )
    assert response.status_code == 201
    assert response.json()["email"] == "staff@example.com"


def test_admin_can_change_role_and_status(client, admin_user, test_user, auth_headers):
    role_response = client.patch(
        f"/api/v1/admin/users/{test_user.id}/role",
        headers=auth_headers(admin_user),
        json={"role": "admin"},
    )
    assert role_response.status_code == 200
    assert role_response.json()["role"] == "admin"

    status_response = client.patch(
        f"/api/v1/admin/users/{test_user.id}/status",
        headers=auth_headers(admin_user),
        json={"status": "inactive"},
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "inactive"


def test_cannot_create_duplicate_email(client, admin_user, test_user, auth_headers):
    response = client.post(
        "/api/v1/admin/users/",
        headers=auth_headers(admin_user),
        json={
            "email": test_user.email,
            "password": "DupPass123!",
            "full_name": "Dup User",
            "role": "member",
            "status": "active",
        },
    )
    assert response.status_code == 400
