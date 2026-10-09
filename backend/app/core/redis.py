import json
import logging
import threading
import time
from typing import Any

from app.core.config import settings

logger = logging.getLogger("bekatuz")

_REDIS_CONNECT_TIMEOUT = 0.5
_REDIS_RETRY_INTERVAL = 30.0


class _MemoryStore:
    def __init__(self) -> None:
        self._data: dict[str, tuple[Any, float | None]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> str | None:
        with self._lock:
            item = self._data.get(key)
            if item is None:
                return None
            value, expires_at = item
            if expires_at is not None and time.time() >= expires_at:
                del self._data[key]
                return None
            return value

    def set(self, key: str, value: str, ex: int | None = None) -> None:
        expires_at = time.time() + ex if ex is not None else None
        with self._lock:
            self._data[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        with self._lock:
            self._data.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


class RedisClient:
    def __init__(self, url: str) -> None:
        self._url = url
        self._client: Any = None
        self._memory = _MemoryStore()
        self._lock = threading.Lock()
        self._last_failure: float = 0.0

    @property
    def mode(self) -> str:
        return "redis" if self._client is not None else "memory"

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        now = time.time()
        if now - self._last_failure < _REDIS_RETRY_INTERVAL:
            return None
        with self._lock:
            if self._client is not None:
                return self._client
            if now - self._last_failure < _REDIS_RETRY_INTERVAL:
                return None
            try:
                import redis as redis_lib

                client = redis_lib.Redis.from_url(
                    self._url,
                    socket_connect_timeout=_REDIS_CONNECT_TIMEOUT,
                    socket_timeout=_REDIS_CONNECT_TIMEOUT,
                )
                client.ping()
                self._client = client
                logger.info("Connected to Redis at %s", self._url)
                return client
            except Exception:
                self._last_failure = now
                logger.info("Redis unavailable, using in-memory store")
                return None

    def ping(self) -> bool:
        client = self._get_client()
        if client is None:
            return False
        try:
            client.ping()
            return True
        except Exception:
            self._client = None
            self._last_failure = time.time()
            return False

    def get(self, key: str) -> str | None:
        client = self._get_client()
        if client is None:
            return self._memory.get(key)
        try:
            value = client.get(key)
        except Exception:
            return self._memory.get(key)
        if value is None:
            return None
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return str(value)

    def set(self, key: str, value: str, ex: int | None = None) -> None:
        client = self._get_client()
        if client is None:
            self._memory.set(key, value, ex=ex)
            return
        try:
            client.set(key, value, ex=ex)
        except Exception:
            self._memory.set(key, value, ex=ex)

    def delete(self, key: str) -> None:
        self._memory.delete(key)
        client = self._get_client()
        if client is None:
            return
        try:
            client.delete(key)
        except Exception:
            pass

    def clear_prefix(self, prefix: str) -> None:
        self._memory.clear()
        client = self._get_client()
        if client is None:
            return
        try:
            for key in client.scan_iter(match=f"{prefix}*"):
                client.delete(key)
        except Exception:
            pass

    def get_json(self, key: str) -> Any | None:
        raw = self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (ValueError, TypeError):
            return None

    def set_json(self, key: str, value: Any, ex: int | None = None) -> None:
        self.set(key, json.dumps(value), ex=ex)


redis_client = RedisClient(settings.redis_url)
