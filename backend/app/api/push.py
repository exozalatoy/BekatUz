from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import PushSubscription, User
from app.schemas.common import DetailOut
from app.schemas.push import PushPublicKeyOut, PushSubscribeIn, PushSubscriptionIn

router = APIRouter(tags=["push"])


@router.get("/push/public-key", response_model=PushPublicKeyOut)
def push_public_key():
    return PushPublicKeyOut(
        public_key=settings.vapid_public_key,
        enabled=settings.web_push_enabled,
    )


@router.post("/push/subscribe", response_model=DetailOut)
def subscribe_push(
    body: PushSubscribeIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    existing = db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )
    if existing is None:
        db.add(
            PushSubscription(
                user_id=user.id,
                endpoint=body.endpoint,
                p256dh=body.keys.p256dh,
                auth=body.keys.auth,
            )
        )
    else:
        existing.user_id = user.id
        existing.p256dh = body.keys.p256dh
        existing.auth = body.keys.auth
    db.commit()
    return DetailOut(detail="Subscription saved")


@router.post("/push/unsubscribe", response_model=DetailOut)
def unsubscribe_push(
    body: PushSubscriptionIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    existing = db.scalar(
        select(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint,
            PushSubscription.user_id == user.id,
        )
    )
    if existing is not None:
        db.delete(existing)
        db.commit()
    return DetailOut(detail="Subscription removed")
