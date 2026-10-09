from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models import Review
from app.schemas.common import Page


class ReviewOut(BaseModel):
    id: int
    driver_id: int
    passenger_id: int | None
    passenger_name: str | None
    rating: int
    comment: str | None
    status: Literal["pending", "approved", "rejected"]
    created_at: datetime


class ReviewCreateIn(BaseModel):
    driver_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewStatusIn(BaseModel):
    status: Literal["pending", "approved", "rejected"]


class DriverReviewsOut(BaseModel):
    average: float
    distribution: dict[str, int]
    items: Page[ReviewOut]


def review_out(review: Review) -> ReviewOut:
    return ReviewOut(
        id=review.id,
        driver_id=review.driver_id,
        passenger_id=review.passenger_id,
        passenger_name=review.passenger.full_name if review.passenger else None,
        rating=review.rating,
        comment=review.comment,
        status=review.status,  # type: ignore[arg-type]
        created_at=review.created_at,
    )
