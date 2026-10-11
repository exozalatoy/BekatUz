import json
import logging

from sqlalchemy import select

from app.core.config import settings
from app.models import Notification, PushSubscription

logger = logging.getLogger("bekatuz")


def create_notification(db, user_id: int, title: str, body: str = "") -> Notification:
    row = Notification(user_id=user_id, title=title, body=body)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def send_web_push(db, user_id: int, title: str, body: str, url: str = "/app") -> int:
    if not settings.web_push_enabled:
        return 0
    subscriptions = db.scalars(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    ).all()
    if not subscriptions:
        return 0

    from pywebpush import WebPushException, webpush

    payload = json.dumps({"title": title, "body": body, "url": url}, ensure_ascii=False)
    sent = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_subject},
            )
            sent += 1
        except WebPushException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                db.delete(sub)
            else:
                logger.warning("Web push failed for subscription %s: %s", sub.id, exc)
        except Exception:
            logger.exception("Web push error for subscription %s", sub.id)
    db.commit()
    return sent


def notify_user(db, user, title: str, body: str = "", url: str = "/app") -> None:
    create_notification(db, user.id, title, body)
    if getattr(user, "notifications_enabled", True):
        try:
            send_web_push(db, user.id, title, body, url)
        except Exception:
            logger.exception("Failed to send web push to user %s", user.id)
