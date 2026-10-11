import asyncio

from fastapi import WebSocket
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Trip, Vehicle


class ConnectionManager:
    def __init__(self) -> None:
        self.vehicles: dict[WebSocket, int | None] = {}
        self.drivers: dict[int, WebSocket] = {}
        self.users: dict[int, set[WebSocket]] = {}
        self.chat_rooms: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect_vehicle(self, websocket: WebSocket, route_id: int | None) -> None:
        async with self._lock:
            self.vehicles[websocket] = route_id

    async def disconnect_vehicle(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.vehicles.pop(websocket, None)

    async def connect_driver(self, driver_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            old = self.drivers.get(driver_id)
            self.drivers[driver_id] = websocket
            if old is not None and old is not websocket:
                try:
                    await old.close()
                except Exception:
                    pass

    async def connect_user(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            self.users.setdefault(user_id, set()).add(websocket)

    async def disconnect_user(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self.users.get(user_id)
            if sockets is not None:
                sockets.discard(websocket)
                if not sockets:
                    self.users.pop(user_id, None)

    async def send_to_user(self, user_id: int, payload: dict) -> bool:
        sockets = list(self.users.get(user_id, set()))
        if not sockets:
            return False
        sent = False
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
                sent = True
            except Exception:
                await self.disconnect_user(user_id, websocket)
        return sent

    def send_to_user_sync(self, user_id: int, payload: dict) -> bool:
        import threading

        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(self.send_to_user(user_id, payload))
        result: dict = {}

        def runner() -> None:
            try:
                result["value"] = asyncio.run(self.send_to_user(user_id, payload))
            except Exception as exc:  # pragma: no cover
                result["error"] = exc

        thread = threading.Thread(target=runner)
        thread.start()
        thread.join()
        if "error" in result:
            raise result["error"]
        return result.get("value", False)

    async def disconnect_driver(self, driver_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            if self.drivers.get(driver_id) is websocket:
                self.drivers.pop(driver_id, None)

    async def join_room(self, room: str, websocket: WebSocket) -> None:
        async with self._lock:
            self.chat_rooms.setdefault(room, set()).add(websocket)

    async def leave_room(self, room: str, websocket: WebSocket) -> None:
        async with self._lock:
            members = self.chat_rooms.get(room)
            if members is not None:
                members.discard(websocket)
                if not members:
                    self.chat_rooms.pop(room, None)

    async def broadcast_room(self, room: str, payload: dict) -> None:
        members = list(self.chat_rooms.get(room, set()))
        for websocket in members:
            try:
                await websocket.send_json(payload)
            except Exception:
                await self.leave_room(room, websocket)

    async def send_to_driver(self, driver_id: int, payload: dict) -> None:
        websocket = self.drivers.get(driver_id)
        if websocket is None:
            return
        try:
            await websocket.send_json(payload)
        except Exception:
            await self.disconnect_driver(driver_id, websocket)

    @staticmethod
    def vehicle_snapshot(route_id: int | None = None) -> list[dict]:
        with SessionLocal() as db:
            stmt = select(Vehicle).order_by(Vehicle.id)
            if route_id is not None:
                stmt = stmt.where(Vehicle.route_id == route_id)
            vehicles = db.scalars(stmt).all()
            return [
                {
                    "id": vehicle.id,
                    "route_id": vehicle.route_id,
                    "lat": vehicle.lat,
                    "lng": vehicle.lng,
                    "speed": vehicle.speed,
                    "bearing": vehicle.bearing,
                    "status": vehicle.status,
                    "updated_at": vehicle.updated_at.isoformat(),
                }
                for vehicle in vehicles
            ]

    @staticmethod
    def pending_requests(driver_id: int, after_id: int = 0) -> list[dict]:
        with SessionLocal() as db:
            stmt = (
                select(Trip)
                .where(Trip.driver_id == driver_id)
                .where(Trip.status == "pending")
                .where(Trip.id > after_id)
                .order_by(Trip.id)
            )
            trips = db.scalars(stmt).all()
            result = []
            for trip in trips:
                passenger_name = trip.passenger.full_name if trip.passenger else None
                result.append(
                    {
                        "id": trip.id,
                        "passenger_id": trip.passenger_id,
                        "passenger_name": passenger_name,
                        "from_name": trip.from_name,
                        "to_name": trip.to_name,
                        "price_som": trip.price_som,
                        "status": trip.status,
                        "created_at": trip.created_at.isoformat(),
                    }
                )
            return result


manager = ConnectionManager()


def vehicle_lite(vehicle: Vehicle) -> dict:
    return {
        "id": vehicle.id,
        "route_id": vehicle.route_id,
        "lat": vehicle.lat,
        "lng": vehicle.lng,
        "speed": vehicle.speed,
        "bearing": vehicle.bearing,
        "status": vehicle.status,
        "updated_at": vehicle.updated_at.isoformat(),
    }
