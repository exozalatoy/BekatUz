from datetime import timedelta

from app.core.database import SessionLocal, utcnow
from app.models import TelegramCode
from tests.conftest import TEST_PASSWORD


def _register(client, phone: str, role: str = "passenger") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Yangi Foydalanuvchi",
            "phone": phone,
            "password": "Secret123!",
            "password_confirm": "Secret123!",
            "role": role,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_register_verify_me(client):
    phone = "+998901000001"
    data = _register(client, phone)
    assert data["phone"] == phone
    assert data["dev_code"] and len(data["dev_code"]) == 6

    verify = client.post(
        "/api/v1/auth/verify-code", json={"phone": phone, "code": data["dev_code"]}
    )
    assert verify.status_code == 200
    body = verify.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["is_verified"] is True
    assert body["user"]["role"] == "passenger"

    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["phone"] == phone


def test_register_password_mismatch(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test",
            "phone": "+998901000002",
            "password": "Secret123!",
            "password_confirm": "Different123!",
            "role": "passenger",
        },
    )
    assert response.status_code == 422
    assert "detail" in response.json()


def test_register_duplicate_phone(client):
    phone = "+998901000003"
    _register(client, phone)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test",
            "phone": phone,
            "password": "Secret123!",
            "password_confirm": "Secret123!",
            "role": "passenger",
        },
    )
    assert response.status_code == 409


def test_wrong_code(client):
    phone = "+998901000004"
    data = _register(client, phone)
    correct = int(data["dev_code"])
    wrong = f"{(correct + 1) % 1000000:06d}"
    response = client.post(
        "/api/v1/auth/verify-code", json={"phone": phone, "code": wrong}
    )
    assert response.status_code == 400


def test_expired_code(client):
    phone = "+998901000005"
    data = _register(client, phone)
    with SessionLocal() as db:
        row = db.query(TelegramCode).filter(TelegramCode.phone == phone).first()
        row.expires_at = utcnow() - timedelta(minutes=1)
        db.commit()
    response = client.post(
        "/api/v1/auth/verify-code", json={"phone": phone, "code": data["dev_code"]}
    )
    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


def test_login_by_phone_and_email(client, seeded, auth):
    phone_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "+998901234567", "password": TEST_PASSWORD},
    )
    assert phone_login.status_code == 200
    assert "access_token" in phone_login.json()

    email_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@test.uz", "password": TEST_PASSWORD},
    )
    assert email_login.status_code == 200
    assert email_login.json()["user"]["role"] == "admin"

    wrong = client.post(
        "/api/v1/auth/login",
        json={"identifier": "+998901234567", "password": "wrong"},
    )
    assert wrong.status_code == 401


def test_refresh_rotation(client, seeded):
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "+998901234567", "password": TEST_PASSWORD},
    )
    refresh_token = login.json()["refresh_token"]

    first = client.post("/api/v1/auth/refresh", json={"refresh": refresh_token})
    assert first.status_code == 200
    new_access = first.json()["access_token"]
    new_refresh = first.json().get("refresh_token")
    assert new_refresh and new_refresh != refresh_token

    reused = client.post("/api/v1/auth/refresh", json={"refresh": refresh_token})
    assert reused.status_code == 401

    second = client.post("/api/v1/auth/refresh", json={"refresh": new_refresh})
    assert second.status_code == 200
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert me.status_code == 200


def test_logout(client, seeded):
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "+998901234567", "password": TEST_PASSWORD},
    )
    refresh_token = login.json()["refresh_token"]
    logout = client.post("/api/v1/auth/logout", json={"refresh": refresh_token})
    assert logout.status_code == 200
    reuse = client.post("/api/v1/auth/refresh", json={"refresh": refresh_token})
    assert reuse.status_code == 401


def test_forgot_and_reset_password(client):
    phone = "+998901000006"
    data = _register(client, phone)
    client.post(
        "/api/v1/auth/verify-code", json={"phone": phone, "code": data["dev_code"]}
    )
    forgot = client.post(
        "/api/v1/auth/forgot-password", json={"identifier": phone}
    )
    assert forgot.status_code == 200
    token = forgot.json()["dev_token"]
    assert token

    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "BrandNew123!"},
    )
    assert reset.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": phone, "password": "BrandNew123!"},
    )
    assert login.status_code == 200


def test_rate_limit_on_login(client, seeded):
    statuses = []
    for _ in range(11):
        response = client.post(
            "/api/v1/auth/login",
            json={"identifier": "+998901234567", "password": "definitely-wrong"},
        )
        statuses.append(response.status_code)
    assert statuses[-1] == 429
    assert 401 in statuses
