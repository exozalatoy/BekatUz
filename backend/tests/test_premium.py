import base64


def test_list_plans(client, seeded):
    response = client.get("/api/v1/premium/plans")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) >= 1
    plan = next(p for p in items if p["id"] == seeded["plan"])
    assert plan["name"] == "1 oy"
    assert plan["currency"] == "USD"
    assert plan["duration_days"] == 30
    assert plan["is_first_month_free"] is True
    assert isinstance(plan["features"], list)


def test_subscribe_requires_auth(client, seeded):
    response = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"]},
    )
    assert response.status_code in (401, 403)


def test_payment_info_returns_card(client):
    response = client.get("/api/v1/premium/payment-info")
    assert response.status_code == 200
    body = response.json()
    assert body["card_number"] == "5614 6818 8670 3564"


def test_subscribe_creates_pending_card_payment(client, seeded, tokens, auth):
    subscribe = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"]},
        headers=auth(tokens["plain"]),
    )
    assert subscribe.status_code == 200
    body = subscribe.json()
    assert body["status"] == "pending"
    assert body["card_number"] == "5614 6818 8670 3564"
    assert body["amount"] == 1.0
    assert body["currency"] == "USD"

    before = client.get("/api/v1/premium/me", headers=auth(tokens["plain"]))
    assert before.json()["is_premium"] is False


def test_upload_receipt_and_admin_approval(client, seeded, tokens, auth):
    subscribe = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"]},
        headers=auth(tokens["plain"]),
    )
    payment_id = subscribe.json()["payment_id"]

    receipt = "data:image/png;base64," + base64.b64encode(b"fake-png").decode()
    upload = client.post(
        "/api/v1/premium/receipt",
        json={"payment_id": payment_id, "receipt_data": receipt},
        headers=auth(tokens["plain"]),
    )
    assert upload.status_code == 200
    assert upload.json()["status"] == "review"

    me = client.get("/api/v1/premium/me", headers=auth(tokens["plain"]))
    payment = next(p for p in me.json()["payments"] if p["id"] == payment_id)
    assert payment["status"] == "review"

    admin_list = client.get(
        "/api/v1/admin/payments?status=review", headers=auth(tokens["admin"])
    )
    assert admin_list.status_code == 200
    admin_items = admin_list.json()["items"]
    assert any(p["id"] == payment_id for p in admin_items)

    approve = client.post(
        f"/api/v1/admin/payments/{payment_id}/approve",
        headers=auth(tokens["admin"]),
    )
    assert approve.status_code == 200
    assert approve.json()["status"] == "paid"

    me = client.get("/api/v1/premium/me", headers=auth(tokens["plain"]))
    me_body = me.json()
    assert me_body["is_premium"] is True
    assert any(p["status"] == "paid" for p in me_body["payments"])


def test_receipt_requires_owner(client, seeded, tokens, auth):
    subscribe = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"]},
        headers=auth(tokens["passenger"]),
    )
    payment_id = subscribe.json()["payment_id"]

    receipt = "data:image/png;base64," + base64.b64encode(b"fake-png").decode()
    response = client.post(
        "/api/v1/premium/receipt",
        json={"payment_id": payment_id, "receipt_data": receipt},
        headers=auth(tokens["plain"]),
    )
    assert response.status_code == 403


def test_reject_payment(client, seeded, tokens, auth):
    subscribe = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"]},
        headers=auth(tokens["passenger"]),
    )
    payment_id = subscribe.json()["payment_id"]

    receipt = "data:image/jpeg;base64," + base64.b64encode(b"fake-jpg").decode()
    upload = client.post(
        "/api/v1/premium/receipt",
        json={"payment_id": payment_id, "receipt_data": receipt},
        headers=auth(tokens["passenger"]),
    )
    assert upload.status_code == 200

    reject = client.post(
        f"/api/v1/admin/payments/{payment_id}/reject",
        headers=auth(tokens["admin"]),
    )
    assert reject.status_code == 200
    assert reject.json()["status"] == "rejected"

    me = client.get("/api/v1/premium/me", headers=auth(tokens["passenger"]))
    assert me.json()["is_premium"] is False


def test_invalid_receipt_rejected(client, seeded, tokens, auth):
    subscribe = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"]},
        headers=auth(tokens["plain"]),
    )
    payment_id = subscribe.json()["payment_id"]

    response = client.post(
        "/api/v1/premium/receipt",
        json={"payment_id": payment_id, "receipt_data": "not-an-image"},
        headers=auth(tokens["plain"]),
    )
    assert response.status_code == 400