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
        json={"plan_id": seeded["plan"], "provider": "payme"},
    )
    assert response.status_code in (401, 403)


def test_subscribe_and_confirm_payme(client, seeded, tokens, auth):
    subscribe = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"], "provider": "payme"},
        headers=auth(tokens["plain"]),
    )
    assert subscribe.status_code == 200
    body = subscribe.json()
    assert body["status"] == "pending"
    assert body["provider"] == "payme"
    assert body["pay_url"].startswith("https://mock.payme.uz/pay/")

    before = client.get("/api/v1/premium/me", headers=auth(tokens["plain"]))
    assert before.json()["is_premium"] is False

    confirm = client.post(
        "/api/v1/premium/confirm",
        json={"payment_id": body["payment_id"]},
        headers=auth(tokens["plain"]),
    )
    assert confirm.status_code == 200
    assert confirm.json()["is_premium"] is True
    assert confirm.json()["expires_at"] is not None

    me = client.get("/api/v1/premium/me", headers=auth(tokens["plain"]))
    me_body = me.json()
    assert me_body["is_premium"] is True
    assert me_body["plan"] is not None
    assert any(p["status"] == "paid" for p in me_body["payments"])


def test_subscribe_click_provider(client, seeded, tokens, auth):
    response = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"], "provider": "click"},
        headers=auth(tokens["passenger"]),
    )
    assert response.status_code == 200
    assert response.json()["pay_url"].startswith("https://mock.click.uz/pay/")


def test_webhook_mock(client, seeded, tokens, auth):
    subscribe = client.post(
        "/api/v1/premium/subscribe",
        json={"plan_id": seeded["plan"], "provider": "payme"},
        headers=auth(tokens["plain"]),
    )
    payment_id = subscribe.json()["payment_id"]
    response = client.post(
        "/api/v1/payments/webhook/payme", json={"payment_id": payment_id}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "paid"
