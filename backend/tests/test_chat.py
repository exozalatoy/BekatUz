import base64


def test_chat_conversations_requires_auth(client):
    response = client.get("/api/v1/chats/conversations")
    assert response.status_code in (401, 403)


def test_get_or_create_conversation(client, seeded, tokens, auth):
    response = client.get(
        "/api/v1/chats/conversation",
        params={"peer_id": seeded["driver"]},
        headers=auth(tokens["passenger"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] > 0
    assert body["peer"]["id"] == seeded["driver"]
    assert body["peer"]["full_name"] == "Test Driver"

    again = client.get(
        "/api/v1/chats/conversation",
        params={"peer_id": seeded["driver"]},
        headers=auth(tokens["passenger"]),
    )
    assert again.status_code == 200
    assert again.json()["id"] == body["id"]


def test_chat_between_drivers_rejected(client, seeded, tokens, auth):
    driver = seeded["driver"]
    response = client.get(
        "/api/v1/chats/conversation",
        params={"peer_id": driver},
        headers=auth(tokens["driver"]),
    )
    assert response.status_code == 400


def test_chat_with_self_rejected(client, seeded, tokens, auth):
    response = client.get(
        "/api/v1/chats/conversation",
        params={"peer_id": seeded["passenger"]},
        headers=auth(tokens["passenger"]),
    )
    assert response.status_code == 400


def test_send_text_and_history(client, seeded, tokens, auth):
    conversation = client.get(
        "/api/v1/chats/conversation",
        params={"peer_id": seeded["driver"]},
        headers=auth(tokens["passenger"]),
    ).json()
    conversation_id = conversation["id"]

    sent = client.post(
        f"/api/v1/chats/{conversation_id}/messages",
        json={"type": "text", "payload": "Assalomu alaykum!"},
        headers=auth(tokens["passenger"]),
    )
    assert sent.status_code == 201
    message = sent.json()
    assert message["sender_id"] == seeded["passenger"]
    assert message["type"] == "text"
    assert message["payload"] == "Assalomu alaykum!"

    history = client.get(
        f"/api/v1/chats/{conversation_id}/messages",
        headers=auth(tokens["driver"]),
    )
    assert history.status_code == 200
    items = history.json()["items"]
    assert any(item["id"] == message["id"] for item in items)


def test_send_image_and_voice(client, seeded, tokens, auth):
    conversation = client.get(
        "/api/v1/chats/conversation",
        params={"peer_id": seeded["driver"]},
        headers=auth(tokens["passenger"]),
    ).json()
    conversation_id = conversation["id"]

    image = "data:image/png;base64," + base64.b64encode(b"fake-receipt").decode()
    sent_image = client.post(
        f"/api/v1/chats/{conversation_id}/messages",
        json={"type": "image", "payload": image},
        headers=auth(tokens["passenger"]),
    )
    assert sent_image.status_code == 201
    assert sent_image.json()["type"] == "image"

    voice = "data:audio/webm;base64," + base64.b64encode(b"fake-voice").decode()
    sent_voice = client.post(
        f"/api/v1/chats/{conversation_id}/messages",
        json={"type": "voice", "payload": voice},
        headers=auth(tokens["driver"]),
    )
    assert sent_voice.status_code == 201
    assert sent_voice.json()["type"] == "voice"


def test_mark_read_updates_unread(client, seeded, tokens, auth):
    conversation = client.get(
        "/api/v1/chats/conversation",
        params={"peer_id": seeded["passenger"]},
        headers=auth(tokens["driver"]),
    ).json()
    conversation_id = conversation["id"]

    client.post(
        f"/api/v1/chats/{conversation_id}/messages",
        json={"type": "text", "payload": "Salom yo'lovchi"},
        headers=auth(tokens["driver"]),
    )
    before = client.get(
        "/api/v1/chats/conversation",
        params={"peer_id": seeded["driver"]},
        headers=auth(tokens["passenger"]),
    ).json()
    assert before["unread"] >= 1

    read = client.post(
        f"/api/v1/chats/{conversation_id}/read",
        headers=auth(tokens["passenger"]),
    )
    assert read.status_code == 200

    after = client.get(
        "/api/v1/chats/conversations",
        headers=auth(tokens["passenger"]),
    )
    conversation_row = next(
        (c for c in after.json()["items"] if c["id"] == conversation_id), None
    )
    assert conversation_row is not None
    assert conversation_row["unread"] == 0


def test_finish_work_sets_offline(client, seeded, tokens, auth):
    finish = client.post(
        "/api/v1/drivers/me/finish-work",
        headers=auth(tokens["driver"]),
    )
    assert finish.status_code == 200
    assert finish.json()["online"] is False