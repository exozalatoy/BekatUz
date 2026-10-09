def test_non_admin_forbidden(client, tokens, auth):
    for path in ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/news"]:
        response = client.get(path, headers=auth(tokens["passenger"]))
        assert response.status_code == 403


def test_admin_stats_shape(client, tokens, auth):
    response = client.get("/api/v1/admin/stats", headers=auth(tokens["admin"]))
    assert response.status_code == 200
    body = response.json()
    for key in (
        "users",
        "drivers",
        "orders",
        "premium_subscriptions",
        "chart",
        "latest_news",
        "latest_users",
    ):
        assert key in body
    assert len(body["chart"]) == 7
    assert all({"date", "users", "orders"} <= set(point) for point in body["chart"])
    assert body["users"] >= 4


def test_admin_news_crud(client, tokens, auth):
    headers = auth(tokens["admin"])
    created = client.post(
        "/api/v1/admin/news",
        json={
            "title": "Admin yangilik",
            "body": "Admin tomonidan qo'shildi",
            "category": "city",
        },
        headers=headers,
    )
    assert created.status_code == 201
    news_id = created.json()["id"]

    updated = client.patch(
        f"/api/v1/admin/news/{news_id}",
        json={"title": "Yangilangan sarlavha"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Yangilangan sarlavha"

    listed = client.get("/api/v1/admin/news", headers=headers)
    assert any(item["id"] == news_id for item in listed.json()["items"])

    deleted = client.delete(f"/api/v1/admin/news/{news_id}", headers=headers)
    assert deleted.status_code == 200
    assert client.get(f"/api/v1/news/{news_id}").status_code == 404


def test_admin_block_user(client, tokens, auth, seeded):
    headers = auth(tokens["admin"])
    created = client.post(
        "/api/v1/admin/users",
        json={
            "full_name": "Block Me",
            "phone": "+998909998877",
            "password": "Block123!",
            "role": "passenger",
        },
        headers=headers,
    )
    assert created.status_code == 201
    user_id = created.json()["id"]

    blocked = client.patch(
        f"/api/v1/admin/users/{user_id}",
        json={"is_blocked": True},
        headers=headers,
    )
    assert blocked.status_code == 200
    assert blocked.json()["is_blocked"] is True


def test_admin_driver_approve(client, tokens, auth):
    headers = auth(tokens["admin"])
    created = client.post(
        "/api/v1/admin/drivers",
        json={
            "full_name": "Yangi Haydovchi",
            "phone": "+998909112233",
            "password": "Driver123!",
            "vehicle_category": "Gazel",
            "is_approved": False,
        },
        headers=headers,
    )
    assert created.status_code == 201
    driver_id = created.json()["id"]
    assert created.json()["is_approved"] is False

    approved = client.patch(
        f"/api/v1/admin/drivers/{driver_id}",
        json={"is_approved": True},
        headers=headers,
    )
    assert approved.status_code == 200
    assert approved.json()["is_approved"] is True


def test_admin_route_stops_crud(client, tokens, auth):
    headers = auth(tokens["admin"])
    created = client.post(
        "/api/v1/admin/routes",
        json={
            "name": "99-avtobus",
            "type": "bus",
            "city": "Toshkent",
            "from_name": "A",
            "to_name": "B",
            "stops": [
                {"name": "Birinchi", "lat": 41.30, "lng": 69.25, "order": 0},
                {"name": "Ikkinchi", "lat": 41.31, "lng": 69.26, "order": 1},
            ],
        },
        headers=headers,
    )
    assert created.status_code == 201
    route_id = created.json()["id"]
    assert created.json()["stops_count"] == 2

    patched = client.patch(
        f"/api/v1/admin/routes/{route_id}",
        json={"stops": [{"name": "Yagona", "lat": 41.3, "lng": 69.2, "order": 0}]},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["stops_count"] == 1

    assert client.delete(f"/api/v1/admin/routes/{route_id}", headers=headers).status_code == 200


def test_admin_reviews_moderation(client, tokens, auth, seeded):
    headers = auth(tokens["admin"])
    listed = client.get("/api/v1/admin/reviews", headers=headers)
    assert listed.status_code == 200
    review_id = listed.json()["items"][0]["id"]
    patched = client.patch(
        f"/api/v1/admin/reviews/{review_id}",
        json={"status": "rejected"},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["status"] == "rejected"
