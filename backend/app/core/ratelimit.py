import json
import threading
import time

from fastapi import Request

from app.core.errors import DomainError
from app.core.redis import redis_client

_lock = threading.Lock()
_prefix = "rl"


def _client_ip(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return "unknown"


def check_rate_limit(endpoint: str, limit: int, window: int, identifier: str) -> None:
    key = f"{_prefix}:{endpoint}:{identifier}"
    now = time.time()
    with _lock:
        raw = redis_client.get(key)
        timestamps: list[float] = []
        if raw:
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    timestamps = [float(t) for t in parsed]
            except (ValueError, TypeError):
                timestamps = []
        timestamps = [t for t in timestamps if now - t < window]
        if len(timestamps) >= limit:
            raise DomainError("Too many requests, please try again later", 429)
        timestamps.append(now)
        redis_client.set(key, json.dumps(timestamps), ex=window)


def rate_limit(endpoint: str, limit: int, window: int = 60):
    def dependency(request: Request) -> None:
        check_rate_limit(endpoint, limit, window, _client_ip(request))

    return dependency


def reset_rate_limits() -> None:
    redis_client.clear_prefix(f"{_prefix}:")
