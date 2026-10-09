from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.transport import VehicleOut


class DriverOrderOut(BaseModel):
    id: int
    route_name: str
    from_name: str
    to_name: str
    time: datetime
    price_som: float
    status: str
    passengers: int


class DriverMeOut(BaseModel):
    id: int
    full_name: str
    rating: float
    online: bool
    is_premium: bool
    vehicle_category: str
    vehicle: VehicleOut | None = None
    today_orders: list[DriverOrderOut] = []


class DriverPatchIn(BaseModel):
    online: bool | None = None
    vehicle_category: str | None = Field(default=None, max_length=40)
    vehicle_id: int | None = None


class DriverLocationIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    speed: float = Field(default=0.0, ge=0)
    bearing: float = Field(default=0.0, ge=0, le=360)


class DriverRequestOut(BaseModel):
    id: int
    passenger_name: str | None
    from_name: str
    to_name: str
    price_som: float
    status: str


class DriverRequestListOut(BaseModel):
    items: list[DriverRequestOut]
