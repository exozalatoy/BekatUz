import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import (
    admin,
    auth,
    chats,
    driver,
    news,
    notifications,
    premium,
    push,
    reviews,
    routes,
    users,
    vehicles,
    ws,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.errors import register_exception_handlers
from app.core.redis import redis_client
from app.services.simulator import start_simulator, stop_simulator
from app.services.telegram_bot import start_bot, stop_bot

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bekatuz")

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if redis_client.ping():
        logger.info("Redis connection established")
    else:
        logger.info("Running without Redis (in-memory fallback)")
    if settings.simulate_vehicles:
        start_simulator()
    try:
        start_bot()
    except Exception:
        logger.exception("Failed to start Telegram bot")
    yield
    await stop_bot()
    await stop_simulator()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Bekat Uz API",
        version="1.0.0",
        description="Bekat Uz transport super-app API",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    for module in (
        auth,
        users,
        routes,
        vehicles,
        news,
        reviews,
        premium,
        notifications,
        push,
        chats,
        driver,
        admin,
    ):
        app.include_router(module.router, prefix=API_PREFIX)
    app.include_router(ws.router)

    @app.get("/health", tags=["health"])
    def health(db=Depends(get_db)):
        database = "ok"
        try:
            db.execute(text("SELECT 1"))
        except Exception:
            database = "error"
        return {
            "status": "ok",
            "database": database,
            "redis": redis_client.mode,
            "simulator": settings.simulate_vehicles,
        }

    @app.get("/", tags=["health"])
    def root():
        return {"name": "Bekat Uz API", "docs": "/docs", "version": "1.0.0"}

    return app


app = create_app()
