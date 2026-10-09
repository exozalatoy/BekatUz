import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.database import SessionLocal, utcnow
from app.core.deps import get_user_from_token
from app.core.errors import DomainError
from app.models import LocationPing, Vehicle
from app.services.realtime import manager

router = APIRouter(tags=["websocket"])

_TICK = 2.0
_DRIVER_POLL = 3.0


@router.websocket("/ws/vehicles")
async def ws_vehicles(websocket: WebSocket, route_id: int | None = None):
    await websocket.accept()
    await manager.connect_vehicle(websocket, route_id)

    async def sender() -> None:
        while True:
            snapshot = manager.vehicle_snapshot(route_id)
            await websocket.send_json({"type": "vehicles", "data": snapshot})
            await asyncio.sleep(_TICK)

    async def receiver() -> None:
        while True:
            await websocket.receive_text()

    tasks = [asyncio.create_task(sender()), asyncio.create_task(receiver())]
    try:
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    except Exception:
        pass
    finally:
        for task in tasks:
            task.cancel()
        await manager.disconnect_vehicle(websocket)


def _authenticate(token: str | None):
    if not token:
        return None
    with SessionLocal() as db:
        try:
            return get_user_from_token(db, token)
        except DomainError:
            return None


@router.websocket("/ws/driver")
async def ws_driver(websocket: WebSocket, token: str | None = None):
    user = _authenticate(token)
    if user is None or user.role != "driver":
        await websocket.close(code=4401)
        return
    driver_id = user.id
    await websocket.accept()
    await manager.connect_driver(driver_id, websocket)

    async def receiver() -> None:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "location":
                with SessionLocal() as db:
                    vehicle = (
                        db.query(Vehicle).filter(Vehicle.driver_id == driver_id).first()
                    )
                    lat = float(message.get("lat", 0.0))
                    lng = float(message.get("lng", 0.0))
                    speed = float(message.get("speed", 0.0))
                    bearing = float(message.get("bearing", 0.0))
                    if vehicle is not None:
                        vehicle.lat = lat
                        vehicle.lng = lng
                        vehicle.speed = speed
                        vehicle.bearing = bearing
                        vehicle.status = "moving" if speed > 0 else "idle"
                        vehicle.updated_at = utcnow()
                    db.add(
                        LocationPing(
                            driver_id=driver_id,
                            vehicle_id=vehicle.id if vehicle else None,
                            lat=lat,
                            lng=lng,
                            speed=speed,
                            bearing=bearing,
                        )
                    )
                    db.commit()
                await websocket.send_json({"type": "ok"})

    async def requester() -> None:
        last_id = 0
        while True:
            await asyncio.sleep(_DRIVER_POLL)
            for request in manager.pending_requests(driver_id, after_id=last_id):
                await websocket.send_json({"type": "request", "data": request})
                last_id = max(last_id, request["id"])

    tasks = [
        asyncio.create_task(receiver()),
        asyncio.create_task(requester()),
    ]
    try:
        done, pending = await asyncio.wait(
            tasks, return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
    except WebSocketDisconnect:
        pass
    finally:
        for task in tasks:
            task.cancel()
        await manager.disconnect_driver(driver_id, websocket)


@router.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket, token: str | None = None, room: str = "lobby"):
    user = _authenticate(token)
    if user is None:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    await manager.join_room(room, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") != "message":
                continue
            data = message.get("data") or {}
            payload = {
                "type": "message",
                "data": {
                    "id": uuid.uuid4().hex,
                    "from": user.full_name,
                    "text": str(data.get("text", "")),
                    "created_at": utcnow().isoformat(),
                },
            }
            await manager.broadcast_room(room, payload)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await manager.leave_room(room, websocket)
