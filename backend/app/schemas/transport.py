from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models import Route, Vehicle


class RouteOut(BaseModel):
    id: int
    name: str
    type: Literal["bus", "minibus", "taxi", "train"]
    city: str
    from_name: str
    to_name: str
    first_time: str
    last_time: str
    interval_min: int
    price: float
    stops_count: int
    vehicles_count: int
    color: str


class RouteStopOut(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    order: int


class VehicleRouteBrief(BaseModel):
    id: int
    name: str
    color: str
    from_name: str
    to_name: str


class VehicleOut(BaseModel):
    id: int
    route_id: int | None
    driver_id: int | None
    plate: str
    category: str
    status: Literal["moving", "idle", "offline"]
    lat: float
    lng: float
    speed: float
    bearing: float
    seats_total: int
    seats_free: int
    updated_at: datetime
    route: VehicleRouteBrief | None = None


class RouteDetailOut(RouteOut):
    stops: list[RouteStopOut] = []
    vehicles: list[VehicleOut] = []


class NearbyVehicleOut(BaseModel):
    vehicle: VehicleOut
    eta_min: float
    distance_km: float


def route_out(route: Route) -> RouteOut:
    return RouteOut(
        id=route.id,
        name=route.name,
        type=route.type,  # type: ignore[arg-type]
        city=route.city,
        from_name=route.from_name,
        to_name=route.to_name,
        first_time=route.first_time,
        last_time=route.last_time,
        interval_min=route.interval_min,
        price=route.price,
        stops_count=len(route.stops),
        vehicles_count=len(route.vehicles),
        color=route.color,
    )


def route_stop_out(stop) -> RouteStopOut:
    return RouteStopOut(
        id=stop.id, name=stop.name, lat=stop.lat, lng=stop.lng, order=stop.order
    )


def vehicle_out(vehicle: Vehicle) -> VehicleOut:
    route = vehicle.route
    route_brief = None
    if route is not None:
        route_brief = VehicleRouteBrief(
            id=route.id,
            name=route.name,
            color=route.color,
            from_name=route.from_name,
            to_name=route.to_name,
        )
    return VehicleOut(
        id=vehicle.id,
        route_id=vehicle.route_id,
        driver_id=vehicle.driver_id,
        plate=vehicle.plate,
        category=vehicle.category,
        status=vehicle.status,  # type: ignore[arg-type]
        lat=vehicle.lat,
        lng=vehicle.lng,
        speed=vehicle.speed,
        bearing=vehicle.bearing,
        seats_total=vehicle.seats_total,
        seats_free=vehicle.seats_free,
        updated_at=vehicle.updated_at,
        route=route_brief,
    )


def route_detail_out(route: Route) -> RouteDetailOut:
    base = route_out(route)
    return RouteDetailOut(
        **base.model_dump(),
        stops=[route_stop_out(s) for s in route.stops],
        vehicles=[vehicle_out(v) for v in route.vehicles],
    )
