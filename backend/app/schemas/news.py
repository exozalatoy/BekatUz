from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models import News


class NewsOut(BaseModel):
    id: int
    title: str
    body: str
    category: Literal["transport", "city", "announcements"]
    image_url: str | None = None
    views: int
    published_at: datetime
    is_pinned: bool


class NewsCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    category: Literal["transport", "city", "announcements"] = "city"
    image_url: str | None = None
    is_pinned: bool = False


class NewsUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, min_length=1)
    category: Literal["transport", "city", "announcements"] | None = None
    image_url: str | None = None
    is_pinned: bool | None = None


def news_out(item: News) -> NewsOut:
    return NewsOut(
        id=item.id,
        title=item.title,
        body=item.body,
        category=item.category,  # type: ignore[arg-type]
        image_url=item.image_url,
        views=item.views,
        published_at=item.published_at,
        is_pinned=item.is_pinned,
    )
