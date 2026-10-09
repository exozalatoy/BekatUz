from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.core.database import get_db, utcnow
from app.core.deps import get_current_user
from app.core.errors import DomainError
from app.models import LocationPing, Trip, User, Vehicle
from app.schemas.common import DetailOut
from app.schemas.driver import (
    DriverLocationIn,
    DriverMeOut,
    DriverOrderOut,
    DriverPatchIn,
    DriverRequestListOut,
    DriverRequestOut,
)
from app.schemas.review import DriverReviewsOut
from app.schemas.transport import vehicle_out
from app.api.reviews import driver_reviews_payload

router = APIRouter(tags=["driver"])


def _require_driver(user: User) -> User:
    if user.role != "driver":
        raise DomainError("Forbidden", 403)
    return user


@router.get("/drivers/me", response_model=DriverMeOut)
def driver_me(user: User = Depends(get_current_user), db=Depends(get_db)):
    _require_driver(user)
    profile = user.driver_profile
    if profile is None:
        raise DomainError("Driver profile not found", 404)
    vehicle = profile.vehicle
    if vehicle is None:
        vehicle = db.scalar(select(Vehicle).where(Vehicle.driver_id == user.id))
    today_start = datetime.combine(utcnow().date(), datetime.min.time())
    today_end = today_start + timedelta(days=1)
    trips = db.scalars(
        select(Trip)
        .where(Trip.driver_id == user.id)
        .where(Trip.time >= today_start, Trip.time < today_end)
        .order_by(Trip.time)
    ).all()
    orders = [
        DriverOrderOut(
            id=trip.id,
            route_name=trip.route.name if trip.route else "",
            from_name=trip.from_name,
            to_name=trip.to_name,
            time=trip.time,
            price_som=trip.price_som,
            status=trip.status,
            passengers=trip.passengers,
        )
        for trip in trips
    ]
    return DriverMeOut(
        id=user.id,
        full_name=user.full_name,
        rating=profile.rating,
        online=profile.online,
        is_premium=user.is_premium,
        vehicle_category=profile.vehicle_category,
        vehicle=vehicle_out(vehicle) if vehicle is not None else None,
        today_orders=orders,
    )


@router.patch("/drivers/me", response_model=DriverMeOut)
def update_driver_me(
    body: DriverPatchIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    _require_driver(user)
    profile = user.driver_profile
    if profile is None:
        raise DomainError("Driver profile not found", 404)
    data = body.model_dump(exclude_unset=True)
    if "online" in data and data["online"] is not None:
        profile.online = data["online"]
    if "vehicle_category" in data and data["vehicle_category"] is not None:
        profile.vehicle_category = data["vehicle_category"]
    if "vehicle_id" in data and data["vehicle_id"] is not None:
        vehicle = db.get(Vehicle, data["vehicle_id"])
        if vehicle is None:
            raise DomainError("Vehicle not found", 404)
        profile.vehicle_id = vehicle.id
        vehicle.driver_id = user.id
    db.commit()
    return driver_me(user=user, db=db)


@router.get("/drivers/me/ratings", response_model=DriverReviewsOut)
def my_ratings(
    user: User = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
):
    _require_driver(user)
    return driver_reviews_payload(db, user.id, page, page_size)


@router.post("/drivers/me/location", response_model=DetailOut)
def update_location(
    body: DriverLocationIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    _require_driver(user)
    vehicle = db.scalar(select(Vehicle).where(Vehicle.driver_id == user.id))
    if vehicle is None and user.driver_profile is not None:
        vehicle = user.driver_profile.vehicle
    if vehicle is None:
        raise DomainError("Vehicle not found", 404)
    vehicle.lat = body.lat
    vehicle.lng = body.lng
    vehicle.speed = body.speed
    vehicle.bearing = body.bearing
    vehicle.status = "moving" if body.speed > 0 else "idle"
    vehicle.updated_at = utcnow()
    db.add(
        LocationPing(
            driver_id=user.id,
            vehicle_id=vehicle.id,
            lat=body.lat,
            lng=body.lng,
            speed=body.speed,
            bearing=body.bearing,
        )
    )
    db.commit()
    return DetailOut(detail="Location updated")


@router.get("/drivers/requests", response_model=DriverRequestListOut)
def list_requests(user: User = Depends(get_current_user), db=Depends(get_db)):
    _require_driver(user)
    trips = db.scalars(
        select(Trip)
        .where(Trip.driver_id == user.id)
        .order_by(Trip.id.desc())
    ).all()
    items = [
        DriverRequestOut(
            id=trip.id,
            passenger_name=trip.passenger.full_name if trip.passenger else None,
            from_name=trip.from_name,
            to_name=trip.to_name,
            price_som=trip.price_som,
            status=trip.status,
        )
        for trip in trips
    ]
    return DriverRequestListOut(items=items)


def _update_request_status(
    user: User, db, request_id: int, status: str
) -> DetailOut:
    _require_driver(user)
    trip = db.get(Trip, request_id)
    if trip is None or trip.driver_id != user.id:
        raise DomainError("Request not found", 404)
    if trip.status != "pending":
        raise DomainError("Request already processed", 400)
    trip.status = status
    db.commit()
    return DetailOut(detail=f"Request {status}")


@router.post("/drivers/requests/{request_id}/accept", response_model=DetailOut)
def accept_request(
    request_id: int,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    return _update_request_status(user, db, request_id, "accepted")


@router.post("/drivers/requests/{request_id}/decline", response_model=DetailOut)
def decline_request(
    request_id: int,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    return _update_request_status(user, db, request_id, "declined")
