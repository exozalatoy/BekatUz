from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models import DriverProfile, Trip, User
from app.schemas.news import NewsOut
from app.schemas.user import UserOut, user_out


class AdminUserCreateIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=r"^\+998\d{9}$")
    email: str | None = None
    password: str = Field(min_length=6, max_length=128)
    role: Literal["passenger", "driver", "admin"] = "passenger"


class AdminUserUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    email: str | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: Literal["passenger", "driver", "admin"] | None = None
    language: Literal["uz", "ru", "en"] | None = None
    is_verified: bool | None = None
    is_blocked: bool | None = None


class AdminDriverOut(BaseModel):
    id: int
    full_name: str
    phone: str
    email: str | None = None
    rating: float
    online: bool
    vehicle_category: str
    is_approved: bool
    is_blocked: bool
    created_at: datetime


class AdminDriverCreateIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=r"^\+998\d{9}$")
    email: str | None = None
    password: str = Field(min_length=6, max_length=128)
    vehicle_category: str = "Yengil avto"
    is_approved: bool = False


class AdminDriverUpdateIn(BaseModel):
    is_approved: bool | None = None
    is_blocked: bool | None = None
    vehicle_category: str | None = None
    online: bool | None = None


class AdminVehicleCreateIn(BaseModel):
    route_id: int | None = None
    driver_id: int | None = None
    plate: str = Field(min_length=3, max_length=20)
    category: str = "Yengil avto"
    status: Literal["moving", "idle", "offline"] = "idle"
    lat: float = 0.0
    lng: float = 0.0
    speed: float = 0.0
    bearing: float = 0.0
    seats_total: int = 16
    seats_free: int = 16


class AdminVehicleUpdateIn(BaseModel):
    route_id: int | None = None
    driver_id: int | None = None
    plate: str | None = None
    category: str | None = None
    status: Literal["moving", "idle", "offline"] | None = None
    lat: float | None = None
    lng: float | None = None
    speed: float | None = None
    bearing: float | None = None
    seats_total: int | None = None
    seats_free: int | None = None


class RouteStopIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    order: int = 0


class AdminRouteCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: Literal["bus", "minibus", "taxi", "train"] = "bus"
    city: str = "Toshkent"
    from_name: str = Field(min_length=1, max_length=120)
    to_name: str = Field(min_length=1, max_length=120)
    first_time: str = "06:00"
    last_time: str = "23:00"
    interval_min: int = Field(default=10, ge=1)
    price: float = Field(default=0.0, ge=0)
    color: str = "#1d4ed8"
    stops: list[RouteStopIn] = []


class AdminRouteUpdateIn(BaseModel):
    name: str | None = None
    type: Literal["bus", "minibus", "taxi", "train"] | None = None
    city: str | None = None
    from_name: str | None = None
    to_name: str | None = None
    first_time: str | None = None
    last_time: str | None = None
    interval_min: int | None = Field(default=None, ge=1)
    price: float | None = Field(default=None, ge=0)
    color: str | None = None
    stops: list[RouteStopIn] | None = None


class AdminStatsOut(BaseModel):
    users: int
    drivers: int
    orders: int
    premium_subscriptions: int
    chart: list["ChartPoint"]
    latest_news: list[NewsOut]
    latest_users: list[UserOut]


class ChartPoint(BaseModel):
    date: str
    users: int
    orders: int


def admin_driver_out(user: User, profile: DriverProfile | None) -> AdminDriverOut:
    return AdminDriverOut(
        id=user.id,
        full_name=user.full_name,
        phone=user.phone,
        email=user.email,
        rating=profile.rating if profile else 5.0,
        online=profile.online if profile else False,
        vehicle_category=profile.vehicle_category if profile else "",
        is_approved=profile.is_approved if profile else False,
        is_blocked=user.is_blocked,
        created_at=user.created_at,
    )


def admin_trip_out(trip: Trip) -> dict:
    return {
        "id": trip.id,
        "driver_id": trip.driver_id,
        "passenger_id": trip.passenger_id,
        "route_id": trip.route_id,
        "from_name": trip.from_name,
        "to_name": trip.to_name,
        "time": trip.time,
        "price_som": trip.price_som,
        "status": trip.status,
        "passengers": trip.passengers,
    }


__all__ = [
    "AdminUserCreateIn",
    "AdminUserUpdateIn",
    "AdminDriverOut",
    "AdminDriverCreateIn",
    "AdminDriverUpdateIn",
    "AdminVehicleCreateIn",
    "AdminVehicleUpdateIn",
    "RouteStopIn",
    "AdminRouteCreateIn",
    "AdminRouteUpdateIn",
    "AdminStatsOut",
    "ChartPoint",
    "admin_driver_out",
    "admin_trip_out",
    "user_out",
]
