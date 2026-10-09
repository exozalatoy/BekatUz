from datetime import datetime

from pydantic import BaseModel

from app.models import Notification


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    is_read: bool
    created_at: datetime


class NotificationListOut(BaseModel):
    items: list[NotificationOut]


def notification_out(item: Notification) -> NotificationOut:
    return NotificationOut(
        id=item.id,
        title=item.title,
        body=item.body,
        is_read=item.is_read,
        created_at=item.created_at,
    )
