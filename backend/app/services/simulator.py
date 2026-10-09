import asyncio
import logging
import random

from sqlalchemy import select

from app.core.database import SessionLocal, utcnow
from app.models import RouteStop, Vehicle
from app.services.geo import bearing_deg, haversine_km

logger = logging.getLogger("bekatuz")

TICK_SECONDS = 2
DEFAULT_SPEED_KMH = 28.0

_task: asyncio.Task | None = None
_state: dict[int, tuple[int, float, float]] = {}


def tick() -> None:
    with SessionLocal() as db:
        routes: dict[int, list[tuple[float, float]]] = {}
        rows = db.execute(
            select(RouteStop.route_id, RouteStop.lat, RouteStop.lng).order_by(
                RouteStop.route_id, RouteStop.order
            )
        ).all()
        for route_id, lat, lng in rows:
            routes.setdefault(route_id, []).append((lat, lng))

        vehicles = db.scalars(select(Vehicle).where(Vehicle.status != "offline")).all()
        now = utcnow()

        for vehicle in vehicles:
            if vehicle.route_id is None:
                continue
            points = routes.get(vehicle.route_id)
            if not points or len(points) < 2:
                continue

            segments = [
                (points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
                for i in range(len(points) - 1)
            ]
            lengths = [haversine_km(a, b, c, d) for a, b, c, d in segments]
            total = sum(lengths)
            if total <= 0:
                continue

            state = _state.get(vehicle.id)
            if state is None or state[0] != vehicle.route_id:
                distance = 0.0
                speed_kmh = DEFAULT_SPEED_KMH
            else:
                _, distance, speed_kmh = state
            if random.random() < 0.1:
                speed_kmh = random.uniform(16.0, 42.0)

            meters_per_tick = speed_kmh / 3.6 * TICK_SECONDS
            distance = (distance + meters_per_tick / 1000.0) % total
            _state[vehicle.id] = (vehicle.route_id, distance, speed_kmh)

            walked = 0.0
            lat = segments[0][0]
            lng = segments[0][1]
            heading = bearing_deg(*segments[0])
            for segment, length in zip(segments, lengths):
                if length > 0 and walked + length >= distance:
                    ratio = max(0.0, min(1.0, (distance - walked) / length))
                    lat = segment[0] + (segment[2] - segment[0]) * ratio
                    lng = segment[1] + (segment[3] - segment[1]) * ratio
                    heading = bearing_deg(segment[0], segment[1], segment[2], segment[3])
                    break
                if length <= 0:
                    lat, lng = segment[2], segment[3]
                    heading = bearing_deg(segment[0], segment[1], segment[2], segment[3])
                    walked += length
                    continue
                walked += length
                lat, lng = segment[2], segment[3]
                heading = bearing_deg(segment[0], segment[1], segment[2], segment[3])

            vehicle.lat = round(lat, 6)
            vehicle.lng = round(lng, 6)
            vehicle.speed = round(speed_kmh, 1)
            vehicle.bearing = round(heading, 1)
            vehicle.status = "moving"
            vehicle.updated_at = now

        db.commit()


async def simulator_loop() -> None:
    logger.info("Vehicle simulator started (every %ss)", TICK_SECONDS)
    while True:
        await asyncio.sleep(TICK_SECONDS)
        try:
            await asyncio.to_thread(tick)
        except Exception:
            logger.exception("Vehicle simulator tick failed")


def start_simulator() -> None:
    global _task
    if _task is None or _task.done():
        _task = asyncio.get_running_loop().create_task(simulator_loop())


async def stop_simulator() -> None:
    global _task
    if _task is not None:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
        _task = None
