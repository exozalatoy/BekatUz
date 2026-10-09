from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import DomainError
from app.models import Notification, User
from app.schemas.common import DetailOut
from app.schemas.notification import NotificationListOut, notification_out

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=NotificationListOut)
def list_notifications(
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    rows = db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    ).all()
    return NotificationListOut(items=[notification_out(row) for row in rows])


@router.post("/notifications/read-all", response_model=DetailOut)
def read_all(user: User = Depends(get_current_user), db=Depends(get_db)):
    rows = db.scalars(
        select(Notification).where(
            Notification.user_id == user.id, Notification.is_read.is_(False)
        )
    ).all()
    for row in rows:
        row.is_read = True
    db.commit()
    return DetailOut(detail="All notifications marked as read")


@router.post("/notifications/{notification_id}/read", response_model=DetailOut)
def read_one(
    notification_id: int,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    row = db.get(Notification, notification_id)
    if row is None or row.user_id != user.id:
        raise DomainError("Notification not found", 404)
    row.is_read = True
    db.commit()
    return DetailOut(detail="Notification marked as read")
