def test_list_routes(client, seeded):
    response = client.get("/api/v1/routes")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) >= 1
    route = next(r for r in items if r["id"] == seeded["route"])
    assert route["name"] == "85-avtobus"
    assert route["type"] == "bus"
    assert route["stops_count"] == 4
    assert route["vehicles_count"] == 1


def test_search_and_city_filter(client, seeded):
    search = client.get("/api/v1/routes", params={"search": "85"})
    assert search.status_code == 200
    assert all("85" in item["name"] for item in search.json()["items"])

    miss = client.get("/api/v1/routes", params={"search": "yoq-bunday"})
    assert miss.json()["items"] == []

    city = client.get("/api/v1/routes", params={"city": "Toshkent"})
    assert any(item["id"] == seeded["route"] for item in city.json()["items"])


def test_route_detail_with_stops_and_vehicles(client, seeded):
    response = client.get(f"/api/v1/routes/{seeded['route']}")
    assert response.status_code == 200
    body = response.json()
    assert len(body["stops"]) == 4
    assert body["stops"][0]["order"] == 0
    assert "lat" in body["stops"][0] and "lng" in body["stops"][0]
    assert len(body["vehicles"]) == 1
    assert body["vehicles"][0]["plate"] == "01A123BC"


def test_route_not_found(client):
    assert client.get("/api/v1/routes/999999").status_code == 404


def test_stops_endpoint(client, seeded):
    response = client.get("/api/v1/stops", params={"route_id": seeded["route"]})
    assert response.status_code == 200
    assert len(response.json()["items"]) == 4


def test_vehicles_by_route_and_detail(client, seeded):
    by_route = client.get("/api/v1/vehicles", params={"route_id": seeded["route"]})
    assert by_route.status_code == 200
    assert len(by_route.json()["items"]) == 1

    detail = client.get(f"/api/v1/vehicles/{seeded['vehicle']}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["plate"] == "01A123BC"
    assert body["route"]["name"] == "85-avtobus"
    assert body["status"] == "moving"


def test_nearby_vehicles_eta(client, seeded):
    response = client.get(
        "/api/v1/vehicles/nearby", params={"lat": 41.2855, "lng": 69.2035, "limit": 5}
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) >= 1
    top = items[0]
    assert top["vehicle"]["id"] == seeded["vehicle"]
    assert top["distance_km"] >= 0
    expected_eta = round(top["distance_km"] / 30 * 60, 1)
    assert abs(top["eta_min"] - expected_eta) < 0.2
    distances = [item["distance_km"] for item in items]
    assert distances == sorted(distances)


def test_vehicles_radius_filter(client, seeded):
    near = client.get(
        "/api/v1/vehicles", params={"lat": 41.2855, "lng": 69.2035, "radius_km": 1}
    )
    assert len(near.json()["items"]) == 1
    far = client.get(
        "/api/v1/vehicles", params={"lat": 41.0, "lng": 69.0, "radius_km": 1}
    )
    assert far.json()["items"] == []
