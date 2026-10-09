from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models import User


class DriverBriefOut(BaseModel):
    id: int
    rating: float
    online: bool
    vehicle_category: str
    is_approved: bool


class UserOut(BaseModel):
    id: int
    full_name: str
    phone: str
    email: str | None = None
    role: Literal["passenger", "driver", "admin"]
    avatar_url: str | None = None
    language: str
    is_verified: bool
    is_premium: bool
    is_blocked: bool
    created_at: datetime
    driver: DriverBriefOut | None = None


def user_out(user: User) -> UserOut:
    driver = None
    profile = user.driver_profile
    if profile is not None:
        driver = DriverBriefOut(
            id=user.id,
            rating=profile.rating,
            online=profile.online,
            vehicle_category=profile.vehicle_category,
            is_approved=profile.is_approved,
        )
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        phone=user.phone,
        email=user.email,
        role=user.role,  # type: ignore[arg-type]
        avatar_url=user.avatar_url,
        language=user.language,
        is_verified=user.is_verified,
        is_premium=user.is_premium,
        is_blocked=user.is_blocked,
        created_at=user.created_at,
        driver=driver,
    )
