from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.core.database import get_db, utcnow
from app.core.deps import get_current_user
from app.core.errors import DomainError
from app.models import Review, User
from app.schemas.common import build_page
from app.schemas.review import DriverReviewsOut, ReviewCreateIn, ReviewOut, review_out

router = APIRouter(tags=["reviews"])


def _distribution(reviews: list[Review]) -> dict[str, int]:
    distribution = {str(rating): 0 for rating in range(5, 0, -1)}
    for review in reviews:
        key = str(review.rating)
        if key in distribution:
            distribution[key] += 1
    return distribution


def _average(reviews: list[Review]) -> float:
    if not reviews:
        return 0.0
    return round(sum(r.rating for r in reviews) / len(reviews), 2)


def driver_reviews_payload(db, driver_id: int, page: int, page_size: int) -> dict:
    base = select(Review).where(
        Review.driver_id == driver_id, Review.status == "approved"
    )
    all_reviews = db.scalars(base.order_by(Review.created_at.desc())).all()
    total = len(all_reviews)
    pages = (total + page_size - 1) // page_size if page_size else 0
    start = (page - 1) * page_size
    page_items = all_reviews[start : start + page_size]
    return {
        "average": _average(all_reviews),
        "distribution": _distribution(all_reviews),
        "items": {
            "items": [review_out(r) for r in page_items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
        },
    }


@router.get("/reviews")
def list_reviews(
    driver_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
):
    stmt = select(Review)
    if driver_id is not None:
        stmt = stmt.where(Review.driver_id == driver_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return build_page([review_out(row) for row in rows], total, page, page_size)


@router.post("/reviews", response_model=ReviewOut, status_code=201)
def create_review(
    body: ReviewCreateIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    driver = db.get(User, body.driver_id)
    if driver is None or driver.role != "driver":
        raise DomainError("Driver not found", 404)
    review = Review(
        driver_id=driver.id,
        passenger_id=user.id,
        rating=body.rating,
        comment=body.comment,
        status="approved",
        created_at=utcnow(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review_out(review)


@router.get("/drivers/{driver_id}/reviews", response_model=DriverReviewsOut)
def driver_reviews(
    driver_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
):
    driver = db.get(User, driver_id)
    if driver is None or driver.role != "driver":
        raise DomainError("Driver not found", 404)
    return driver_reviews_payload(db, driver_id, page, page_size)
