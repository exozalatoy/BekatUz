def test_create_review_requires_auth(client, seeded):
    response = client.post(
        "/api/v1/reviews",
        json={"driver_id": seeded["driver"], "rating": 5, "comment": "Zo'r"},
    )
    assert response.status_code in (401, 403)


def test_create_review(client, seeded, tokens, auth):
    response = client.post(
        "/api/v1/reviews",
        json={"driver_id": seeded["driver"], "rating": 5, "comment": "Ajoyib xizmat"},
        headers=auth(tokens["passenger"]),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["driver_id"] == seeded["driver"]
    assert body["rating"] == 5
    assert body["comment"] == "Ajoyib xizmat"
    assert body["status"] == "approved"


def test_create_review_validation(client, seeded, tokens, auth):
    high = client.post(
        "/api/v1/reviews",
        json={"driver_id": seeded["driver"], "rating": 6},
        headers=auth(tokens["passenger"]),
    )
    assert high.status_code == 422
    low = client.post(
        "/api/v1/reviews",
        json={"driver_id": seeded["driver"], "rating": 0},
        headers=auth(tokens["passenger"]),
    )
    assert low.status_code == 422


def test_create_review_unknown_driver(client, tokens, auth):
    response = client.post(
        "/api/v1/reviews",
        json={"driver_id": 999999, "rating": 5},
        headers=auth(tokens["passenger"]),
    )
    assert response.status_code == 404


def test_list_reviews(client, seeded):
    response = client.get("/api/v1/reviews", params={"driver_id": seeded["driver"]})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 2
    assert len(body["items"]) >= 2


def test_driver_reviews_distribution(client, seeded):
    response = client.get(f"/api/v1/drivers/{seeded['driver']}/reviews")
    assert response.status_code == 200
    body = response.json()
    assert body["average"] > 0
    distribution = body["distribution"]
    assert set(distribution.keys()) == {"5", "4", "3", "2", "1"}
    assert sum(distribution.values()) >= 2
    assert body["items"]["total"] >= 2
    assert "items" in body["items"]
