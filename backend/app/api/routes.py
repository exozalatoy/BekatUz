from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select

from app.core.database import get_db
from app.core.errors import DomainError
from app.models import Route, RouteStop
from app.schemas.transport import (
    RouteDetailOut,
    route_detail_out,
    route_out,
    route_stop_out,
)

router = APIRouter(tags=["routes"])


@router.get("/routes")
def list_routes(
    search: str | None = None,
    city: str | None = None,
    db=Depends(get_db),
):
    stmt = select(Route)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Route.name.ilike(pattern),
                Route.from_name.ilike(pattern),
                Route.to_name.ilike(pattern),
            )
        )
    if city:
        stmt = stmt.where(Route.city == city.strip())
    routes = db.scalars(stmt.order_by(Route.name)).all()
    return {"items": [route_out(route) for route in routes]}


@router.get("/routes/{route_id}", response_model=RouteDetailOut)
def get_route(route_id: int, db=Depends(get_db)):
    route = db.get(Route, route_id)
    if route is None:
        raise DomainError("Route not found", 404)
    return route_detail_out(route)


@router.get("/stops")
def list_stops(route_id: int | None = Query(default=None), db=Depends(get_db)):
    stmt = select(RouteStop)
    if route_id is not None:
        stmt = stmt.where(RouteStop.route_id == route_id)
    stops = db.scalars(stmt.order_by(RouteStop.route_id, RouteStop.order)).all()
    return {"items": [route_stop_out(stop) for stop in stops]}
