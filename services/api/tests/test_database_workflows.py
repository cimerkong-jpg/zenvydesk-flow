def test_product_crud_flow(client, test_user, auth_headers):
    headers = auth_headers(test_user)

    create_response = client.post(
        "/api/v1/products/",
        headers=headers,
        json={
            "name": "Starter Serum",
            "description": "Hydrating serum",
            "price": "29.99",
            "image_url": "https://example.com/serum.png",
        },
    )
    assert create_response.status_code == 200
    product_id = create_response.json()["id"]

    list_response = client.get("/api/v1/products/", headers=headers)
    assert list_response.status_code == 200
    assert any(item["id"] == product_id for item in list_response.json())

    update_response = client.put(
        f"/api/v1/products/{product_id}",
        headers=headers,
        json={
            "name": "Starter Serum Plus",
            "description": "Hydrating serum with vitamin B5",
            "price": "34.99",
            "image_url": "https://example.com/serum-plus.png",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Starter Serum Plus"

    delete_response = client.delete(f"/api/v1/products/{product_id}", headers=headers)
    assert delete_response.status_code == 200

    final_list = client.get("/api/v1/products/", headers=headers)
    assert final_list.status_code == 200
    assert all(item["id"] != product_id for item in final_list.json())


def test_automation_rule_crud_flow(client, test_user, test_page, auth_headers):
    headers = auth_headers(test_user)

    create_response = client.post(
        "/api/v1/automation-rules/",
        headers=headers,
        json={
            "page_id": test_page.id,
            "name": "Daily Product Push",
            "content_type": "promotion",
            "market": "TH",
            "tone": "friendly",
            "language": "th",
            "style": "social ad creative",
            "auto_post": False,
            "scheduled_time": "daily",
            "product_selection_mode": "newest",
        },
    )
    assert create_response.status_code == 200
    rule_id = create_response.json()["id"]

    list_response = client.get("/api/v1/automation-rules/", headers=headers)
    assert list_response.status_code == 200
    assert any(item["id"] == rule_id for item in list_response.json())

    update_response = client.put(
        f"/api/v1/automation-rules/{rule_id}",
        headers=headers,
        json={
            "page_id": test_page.id,
            "name": "Evening Product Push",
            "content_type": "engagement",
            "market": "TH",
            "tone": "playful",
            "language": "en",
            "style": "minimal",
            "auto_post": True,
            "scheduled_time": "18:00",
            "product_selection_mode": "oldest",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Evening Product Push"
    assert update_response.json()["auto_post"] is True

    delete_response = client.delete(f"/api/v1/automation-rules/{rule_id}", headers=headers)
    assert delete_response.status_code == 200

    final_list = client.get("/api/v1/automation-rules/", headers=headers)
    assert final_list.status_code == 200
    assert all(item["id"] != rule_id for item in final_list.json())
