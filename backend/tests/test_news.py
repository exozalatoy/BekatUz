def test_list_news_default(client, seeded):
    response = client.get("/api/v1/news")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 5
    assert body["page"] == 1
    assert body["page_size"] == 20
    assert body["pages"] == 1
    assert len(body["items"]) == 5
    assert body["items"][0]["is_pinned"] is True


def test_news_category_filter(client, seeded):
    transport = client.get("/api/v1/news", params={"category": "transport"})
    assert transport.status_code == 200
    body = transport.json()
    assert body["total"] == 3
    assert all(item["category"] == "transport" for item in body["items"])

    all_news = client.get("/api/v1/news", params={"category": "all"})
    assert all_news.json()["total"] == 5


def test_news_pagination(client, seeded):
    response = client.get("/api/v1/news", params={"page": 2, "page_size": 2})
    body = response.json()
    assert body["page"] == 2
    assert body["page_size"] == 2
    assert body["pages"] == 3
    assert len(body["items"]) == 2


def test_news_search(client, seeded):
    response = client.get("/api/v1/news", params={"search": "Yangilik 3"})
    assert response.json()["total"] == 1


def test_news_detail_increments_views(client, seeded):
    news_id = seeded["news_ids"][0]
    first = client.get(f"/api/v1/news/{news_id}")
    assert first.status_code == 200
    views_before = first.json()["views"]
    second = client.get(f"/api/v1/news/{news_id}")
    assert second.json()["views"] == views_before + 1


def test_news_not_found(client):
    assert client.get("/api/v1/news/999999").status_code == 404
