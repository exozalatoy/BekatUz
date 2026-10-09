from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.core.database import get_db
from app.core.errors import DomainError
from app.models import Vehicle
from app.schemas.transport import NearbyVehicleOut, VehicleOut, vehicle_out
from app.services.geo import eta_minutes, haversine_km

router = APIRouter(tags=["vehicles"])


@router.get("/vehicles/nearby")
def nearby_vehicles(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    limit: int = Query(default=10, ge=1, le=100),
    db=Depends(get_db),
):
    vehicles = db.scalars(
        select(Vehicle).where(Vehicle.status != "offline").order_by(Vehicle.id)
    ).all()
    scored = []
    for vehicle in vehicles:
        distance = haversine_km(lat, lng, vehicle.lat, vehicle.lng)
        scored.append((distance, vehicle))
    scored.sort(key=lambda pair: pair[0])
    items = [
        NearbyVehicleOut(
            vehicle=vehicle_out(vehicle),
            eta_min=eta_minutes(distance),
            distance_km=round(distance, 2),
        )
        for distance, vehicle in scored[:limit]
    ]
    return {"items": [item.model_dump() for item in items]}


@router.get("/vehicles")
def list_vehicles(
    route_id: int | None = None,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float = Query(default=10.0, ge=0),
    db=Depends(get_db),
):
    stmt = select(Vehicle)
    if route_id is not None:
        stmt = stmt.where(Vehicle.route_id == route_id)
    vehicles = db.scalars(stmt.order_by(Vehicle.id)).all()
    if lat is not None and lng is not None:
        vehicles = [
            vehicle
            for vehicle in vehicles
            if haversine_km(lat, lng, vehicle.lat, vehicle.lng) <= radius_km
        ]
    return {"items": [vehicle_out(vehicle) for vehicle in vehicles]}


@router.get("/vehicles/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: int, db=Depends(get_db)):
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise DomainError("Vehicle not found", 404)
    return vehicle_out(vehicle)
