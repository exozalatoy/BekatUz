def test_ws_vehicles_stream(client, seeded):
    with client.websocket_connect("/ws/vehicles") as websocket:
        message = websocket.receive_json()
    assert message["type"] == "vehicles"
    data = message["data"]
    assert isinstance(data, list)
    assert len(data) >= 1
    sample = data[0]
    for key in (
        "id",
        "route_id",
        "lat",
        "lng",
        "speed",
        "bearing",
        "status",
        "updated_at",
    ):
        assert key in sample


def test_ws_vehicles_route_filter(client, seeded):
    with client.websocket_connect(
        f"/ws/vehicles?route_id={seeded['route']}"
    ) as websocket:
        message = websocket.receive_json()
    assert message["type"] == "vehicles"
    assert all(item["route_id"] == seeded["route"] for item in message["data"])


def test_ws_driver_rejects_missing_token(client):
    import pytest

    with pytest.raises(Exception):
        with client.websocket_connect("/ws/driver") as websocket:
            websocket.receive_json()
