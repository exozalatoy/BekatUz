from app.core.database import SessionLocal
from app.models import Notification, PushSubscription, User


def test_push_public_key(client):
    response = client.get("/api/v1/push/public-key")
    assert response.status_code == 200
    body = response.json()
    assert "public_key" in body
    assert "enabled" in body


def test_push_subscribe_and_unsubscribe(client, seeded, tokens, auth):
    endpoint = "https://push.example.com/abc-123"
    payload = {
        "endpoint": endpoint,
        "keys": {"p256dh": "p256dh-key", "auth": "auth-key"},
    }
    response = client.post(
        "/api/v1/push/subscribe", json=payload, headers=auth(tokens["passenger"])
    )
    assert response.status_code == 200

    with SessionLocal() as db:
        row = (
            db.query(PushSubscription)
            .filter(PushSubscription.endpoint == endpoint)
            .one_or_none()
        )
        assert row is not None
        assert row.user_id == seeded["passenger"]

    response = client.post(
        "/api/v1/push/unsubscribe",
        json={"endpoint": endpoint},
        headers=auth(tokens["passenger"]),
    )
    assert response.status_code == 200
    with SessionLocal() as db:
        assert db.query(PushSubscription).filter(
            PushSubscription.endpoint == endpoint
        ).one_or_none() is None


def test_notify_user_creates_notification(client, seeded):
    from app.services.push import notify_user

    with SessionLocal() as db:
        user = db.get(User, seeded["plain"])
        notify_user(db, user, "Sarlavha", "Matn")
        count = (
            db.query(Notification)
            .filter(
                Notification.user_id == seeded["plain"],
                Notification.title == "Sarlavha",
            )
            .count()
        )
        assert count == 1
