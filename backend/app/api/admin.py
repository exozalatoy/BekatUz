from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select

from app.core.database import get_db, utcnow
from app.core.deps import require_role
from app.core.errors import DomainError
from app.core.security import hash_password
from app.models import (
    DriverProfile,
    News,
    Payment,
    PremiumPlan,
    Review,
    Route,
    RouteStop,
    Subscription,
    Trip,
    User,
    Vehicle,
)
from app.schemas.admin import (
    AdminDriverCreateIn,
    AdminDriverOut,
    AdminDriverUpdateIn,
    AdminRouteCreateIn,
    AdminRouteUpdateIn,
    AdminStatsOut,
    AdminUserCreateIn,
    AdminUserUpdateIn,
    AdminVehicleCreateIn,
    AdminVehicleUpdateIn,
    admin_driver_out,
)
from app.schemas.common import build_page
from app.schemas.news import NewsCreateIn, NewsOut, NewsUpdateIn, news_out
from app.schemas.premium import (
    AdminPaymentOut,
    PlanCreateIn,
    PlanOut,
    PlanUpdateIn,
    admin_payment_out,
    plan_out,
)
from app.schemas.review import ReviewOut, ReviewStatusIn, review_out
from app.schemas.transport import RouteOut, VehicleOut, route_out, vehicle_out
from app.schemas.user import UserOut, user_out
from app.services.payments import activate_subscription
from app.services.push import notify_user

router = APIRouter(tags=["admin"])

_admin = require_role("admin")


def _page_args(page: int, page_size: int) -> tuple[int, int, int]:
    return page, page_size, (page - 1) * page_size


@router.get("/admin/stats", response_model=AdminStatsOut)
def admin_stats(user: User = Depends(_admin), db=Depends(get_db)):
    users_count = db.scalar(select(func.count(User.id))) or 0
    drivers_count = (
        db.scalar(select(func.count(User.id)).where(User.role == "driver")) or 0
    )
    orders_count = db.scalar(select(func.count(Trip.id))) or 0
    now = utcnow()
    premium_count = (
        db.scalar(
            select(func.count(Subscription.id)).where(
                Subscription.status == "active", Subscription.expires_at > now
            )
        )
        or 0
    )

    today = now.date()
    days = [today - timedelta(days=offset) for offset in range(6, -1, -1)]
    user_dates = db.scalars(select(User.created_at)).all()
    trip_dates = db.scalars(select(Trip.created_at)).all()

    def _count(dates, day) -> int:
        return sum(1 for value in dates if value is not None and value.date() == day)

    chart = [
        {"date": day.isoformat(), "users": _count(user_dates, day), "orders": _count(trip_dates, day)}
        for day in days
    ]

    latest_news = db.scalars(select(News).order_by(News.published_at.desc()).limit(5)).all()
    latest_users = db.scalars(select(User).order_by(User.created_at.desc()).limit(5)).all()
    return AdminStatsOut(
        users=users_count,
        drivers=drivers_count,
        orders=orders_count,
        premium_subscriptions=premium_count,
        chart=chart,
        latest_news=[news_out(item) for item in latest_news],
        latest_users=[user_out(item) for item in latest_users],
    )


@router.get("/admin/users")
def admin_list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    db=Depends(get_db),
    user: User = Depends(_admin),
):
    stmt = select(User)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                User.full_name.ilike(pattern),
                User.phone.ilike(pattern),
                User.email.ilike(pattern),
            )
        )
    if role:
        stmt = stmt.where(User.role == role)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return build_page([user_out(row) for row in rows], total, page, page_size)


@router.post("/admin/users", response_model=UserOut, status_code=201)
def admin_create_user(
    body: AdminUserCreateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    if db.scalar(select(User).where(User.phone == body.phone)) is not None:
        raise DomainError("Phone number already registered", 409)
    new_user = User(
        full_name=body.full_name,
        phone=body.phone,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        is_verified=True,
    )
    db.add(new_user)
    db.flush()
    if body.role == "driver":
        db.add(DriverProfile(user_id=new_user.id, is_approved=True))
    db.commit()
    return user_out(new_user)


@router.patch("/admin/users/{user_id}", response_model=UserOut)
def admin_update_user(
    user_id: int,
    body: AdminUserUpdateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    target = db.get(User, user_id)
    if target is None:
        raise DomainError("User not found", 404)
    data = body.model_dump(exclude_unset=True)
    password = data.pop("password", None)
    if password:
        target.password_hash = hash_password(password)
    if "email" in data and data["email"]:
        other = db.scalar(
            select(User).where(User.email == data["email"], User.id != user_id)
        )
        if other is not None:
            raise DomainError("Email already in use", 409)
    for field, value in data.items():
        if value is not None:
            setattr(target, field, value)
    db.commit()
    return user_out(target)


@router.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    target = db.get(User, user_id)
    if target is None:
        raise DomainError("User not found", 404)
    db.delete(target)
    db.commit()
    return {"detail": "User deleted"}


@router.get("/admin/drivers")
def admin_list_drivers(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    is_approved: bool | None = None,
    db=Depends(get_db),
    user: User = Depends(_admin),
):
    stmt = select(User).where(User.role == "driver")
    if is_approved is not None:
        stmt = stmt.join(
            DriverProfile, DriverProfile.user_id == User.id
        ).where(DriverProfile.is_approved.is_(is_approved))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    items = [admin_driver_out(row, row.driver_profile) for row in rows]
    return build_page(items, total, page, page_size)


@router.post("/admin/drivers", response_model=AdminDriverOut, status_code=201)
def admin_create_driver(
    body: AdminDriverCreateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    if db.scalar(select(User).where(User.phone == body.phone)) is not None:
        raise DomainError("Phone number already registered", 409)
    driver = User(
        full_name=body.full_name,
        phone=body.phone,
        email=body.email,
        password_hash=hash_password(body.password),
        role="driver",
        is_verified=True,
    )
    db.add(driver)
    db.flush()
    profile = DriverProfile(
        user_id=driver.id,
        vehicle_category=body.vehicle_category,
        is_approved=body.is_approved,
    )
    db.add(profile)
    db.commit()
    return admin_driver_out(driver, profile)


@router.patch("/admin/drivers/{driver_id}", response_model=AdminDriverOut)
def admin_update_driver(
    driver_id: int,
    body: AdminDriverUpdateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    target = db.get(User, driver_id)
    if target is None or target.role != "driver":
        raise DomainError("Driver not found", 404)
    profile = target.driver_profile
    if profile is None:
        profile = DriverProfile(user_id=target.id)
        db.add(profile)
        db.flush()
    data = body.model_dump(exclude_unset=True)
    if data.get("is_approved") is not None:
        profile.is_approved = data["is_approved"]
    if data.get("online") is not None:
        profile.online = data["online"]
    if data.get("vehicle_category") is not None:
        profile.vehicle_category = data["vehicle_category"]
    if data.get("is_blocked") is not None:
        target.is_blocked = data["is_blocked"]
    db.commit()
    return admin_driver_out(target, profile)


@router.delete("/admin/drivers/{driver_id}")
def admin_delete_driver(
    driver_id: int,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    target = db.get(User, driver_id)
    if target is None or target.role != "driver":
        raise DomainError("Driver not found", 404)
    db.delete(target)
    db.commit()
    return {"detail": "Driver deleted"}


@router.get("/admin/vehicles")
def admin_list_vehicles(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    route_id: int | None = None,
    db=Depends(get_db),
    user: User = Depends(_admin),
):
    stmt = select(Vehicle)
    if route_id is not None:
        stmt = stmt.where(Vehicle.route_id == route_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Vehicle.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return build_page([vehicle_out(row) for row in rows], total, page, page_size)


@router.post("/admin/vehicles", response_model=VehicleOut, status_code=201)
def admin_create_vehicle(
    body: AdminVehicleCreateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    vehicle = Vehicle(**body.model_dump())
    db.add(vehicle)
    db.commit()
    return vehicle_out(vehicle)


@router.patch("/admin/vehicles/{vehicle_id}", response_model=VehicleOut)
def admin_update_vehicle(
    vehicle_id: int,
    body: AdminVehicleUpdateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise DomainError("Vehicle not found", 404)
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(vehicle, field, value)
    vehicle.updated_at = utcnow()
    db.commit()
    return vehicle_out(vehicle)


@router.delete("/admin/vehicles/{vehicle_id}")
def admin_delete_vehicle(
    vehicle_id: int,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise DomainError("Vehicle not found", 404)
    db.delete(vehicle)
    db.commit()
    return {"detail": "Vehicle deleted"}


def _replace_stops(db, route: Route, stops) -> None:
    db.query(RouteStop).filter(RouteStop.route_id == route.id).delete()
    db.flush()
    for index, stop in enumerate(stops):
        db.add(
            RouteStop(
                route_id=route.id,
                name=stop.name,
                lat=stop.lat,
                lng=stop.lng,
                order=stop.order if stop.order else index,
            )
        )
    db.commit()


@router.get("/admin/routes")
def admin_list_routes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
    user: User = Depends(_admin),
):
    total = db.scalar(select(func.count(Route.id))) or 0
    rows = db.scalars(
        select(Route).order_by(Route.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return build_page([route_out(row) for row in rows], total, page, page_size)


@router.post("/admin/routes", response_model=RouteOut, status_code=201)
def admin_create_route(
    body: AdminRouteCreateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    data = body.model_dump(exclude={"stops"})
    route = Route(**data)
    db.add(route)
    db.flush()
    for index, stop in enumerate(body.stops):
        db.add(
            RouteStop(
                route_id=route.id,
                name=stop.name,
                lat=stop.lat,
                lng=stop.lng,
                order=stop.order if stop.order else index,
            )
        )
    db.commit()
    db.refresh(route)
    return route_out(route)


@router.patch("/admin/routes/{route_id}", response_model=RouteOut)
def admin_update_route(
    route_id: int,
    body: AdminRouteUpdateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    route = db.get(Route, route_id)
    if route is None:
        raise DomainError("Route not found", 404)
    data = body.model_dump(exclude_unset=True, exclude={"stops"})
    for field, value in data.items():
        if value is not None:
            setattr(route, field, value)
    db.commit()
    if body.stops is not None:
        _replace_stops(db, route, body.stops)
    return route_out(route)


@router.delete("/admin/routes/{route_id}")
def admin_delete_route(
    route_id: int,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    route = db.get(Route, route_id)
    if route is None:
        raise DomainError("Route not found", 404)
    db.query(Vehicle).filter(Vehicle.route_id == route_id).update(
        {Vehicle.route_id: None}
    )
    db.delete(route)
    db.commit()
    return {"detail": "Route deleted"}


@router.get("/admin/news")
def admin_list_news(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
    user: User = Depends(_admin),
):
    total = db.scalar(select(func.count(News.id))) or 0
    rows = db.scalars(
        select(News).order_by(News.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return build_page([news_out(row) for row in rows], total, page, page_size)


@router.post("/admin/news", response_model=NewsOut, status_code=201)
def admin_create_news(
    body: NewsCreateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    item = News(
        title=body.title,
        body=body.body,
        category=body.category,
        image_url=body.image_url,
        is_pinned=body.is_pinned,
        published_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(item)
    db.commit()
    return news_out(item)


@router.patch("/admin/news/{news_id}", response_model=NewsOut)
def admin_update_news(
    news_id: int,
    body: NewsUpdateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    item = db.get(News, news_id)
    if item is None:
        raise DomainError("News not found", 404)
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(item, field, value)
    item.updated_at = utcnow()
    db.commit()
    return news_out(item)


@router.delete("/admin/news/{news_id}")
def admin_delete_news(
    news_id: int,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    item = db.get(News, news_id)
    if item is None:
        raise DomainError("News not found", 404)
    db.delete(item)
    db.commit()
    return {"detail": "News deleted"}


@router.get("/admin/reviews")
def admin_list_reviews(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = None,
    driver_id: int | None = None,
    db=Depends(get_db),
    user: User = Depends(_admin),
):
    stmt = select(Review)
    if status:
        stmt = stmt.where(Review.status == status)
    if driver_id is not None:
        stmt = stmt.where(Review.driver_id == driver_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Review.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return build_page([review_out(row) for row in rows], total, page, page_size)


@router.patch("/admin/reviews/{review_id}", response_model=ReviewOut)
def admin_update_review(
    review_id: int,
    body: ReviewStatusIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    review = db.get(Review, review_id)
    if review is None:
        raise DomainError("Review not found", 404)
    review.status = body.status
    db.commit()
    return review_out(review)


@router.get("/admin/plans")
def admin_list_plans(user: User = Depends(_admin), db=Depends(get_db)):
    plans = db.scalars(select(PremiumPlan).order_by(PremiumPlan.price)).all()
    return {"items": [plan_out(plan) for plan in plans]}


@router.post("/admin/plans", response_model=PlanOut, status_code=201)
def admin_create_plan(
    body: PlanCreateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    plan = PremiumPlan(**body.model_dump())
    db.add(plan)
    db.commit()
    return plan_out(plan)


@router.patch("/admin/plans/{plan_id}", response_model=PlanOut)
def admin_update_plan(
    plan_id: int,
    body: PlanUpdateIn,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    plan = db.get(PremiumPlan, plan_id)
    if plan is None:
        raise DomainError("Plan not found", 404)
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(plan, field, value)
    db.commit()
    return plan_out(plan)


@router.delete("/admin/plans/{plan_id}")
def admin_delete_plan(
    plan_id: int,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    plan = db.get(PremiumPlan, plan_id)
    if plan is None:
        raise DomainError("Plan not found", 404)
    db.delete(plan)
    db.commit()
    return {"detail": "Plan deleted"}


@router.get("/admin/payments")
def admin_list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    stmt = select(Payment)
    if status:
        stmt = stmt.where(Payment.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Payment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = []
    for payment in rows:
        payer = db.get(User, payment.user_id)
        plan = db.get(PremiumPlan, payment.plan_id) if payment.plan_id else None
        items.append(admin_payment_out(payment, payer, plan))
    return build_page(items, total, page, page_size)


@router.post("/admin/payments/{payment_id}/approve", response_model=AdminPaymentOut)
def admin_approve_payment(
    payment_id: int,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise DomainError("Payment not found", 404)
    payer = db.get(User, payment.user_id)
    if payer is None:
        raise DomainError("Payer not found", 404)
    if payment.status != "paid":
        payment.status = "paid"
        payment.paid_at = utcnow()
        db.commit()
        activate_subscription(db, payer, payment)
        db.refresh(payment)
        notify_user(
            db,
            payer,
            "Premium faollashtirildi",
            "To'lovingiz tasdiqlandi. Premium imkoniyatlar faol!",
            "/app/premium",
        )
    plan = db.get(PremiumPlan, payment.plan_id) if payment.plan_id else None
    return admin_payment_out(payment, payer, plan)


@router.post("/admin/payments/{payment_id}/reject", response_model=AdminPaymentOut)
def admin_reject_payment(
    payment_id: int,
    user: User = Depends(_admin),
    db=Depends(get_db),
):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise DomainError("Payment not found", 404)
    if payment.status == "paid":
        raise DomainError("Payment already approved", 400)
    payer = db.get(User, payment.user_id)
    payment.status = "rejected"
    payment.receipt_data = None
    db.commit()
    if payer is not None:
        notify_user(
            db,
            payer,
            "To'lov rad etildi",
            "To'lovingiz tasdiqlanmadi. Iltimos, chekni qayta yuboring.",
            "/app/premium",
        )
    plan = db.get(PremiumPlan, payment.plan_id) if payment.plan_id else None
    return admin_payment_out(payment, payer, plan)
