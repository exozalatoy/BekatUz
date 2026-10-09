import os
import pathlib

os.environ["SIMULATE_VEHICLES"] = "false"
os.environ["DATABASE_URL"] = "sqlite:///./bekatuz_test.db"
os.environ["TELEGRAM_BOT_TOKEN"] = ""
os.environ["SECRET_KEY"] = "test-secret-key"

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, SessionLocal, engine
from app.core.ratelimit import reset_rate_limits
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models import (
    DriverProfile,
    News,
    Notification,
    PremiumPlan,
    Review,
    Route,
    RouteStop,
    User,
    Vehicle,
)

TEST_PASSWORD = "Test1234!"


@pytest.fixture(scope="session")
def setup_database():
    db_path = pathlib.Path("bekatuz_test.db")
    if db_path.exists():
        db_path.unlink()
    Base.metadata.create_all(engine)
    yield
    engine.dispose()
    if db_path.exists():
        try:
            db_path.unlink()
        except PermissionError:
            pass


@pytest.fixture(scope="session")
def client(setup_database):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    reset_rate_limits()
    yield


@pytest.fixture(scope="session")
def seeded(setup_database):
    with SessionLocal() as db:
        admin = User(
            full_name="Test Admin",
            phone="+998900000000",
            email="admin@test.uz",
            password_hash=hash_password(TEST_PASSWORD),
            role="admin",
            is_verified=True,
        )
        driver = User(
            full_name="Test Driver",
            phone="+998907654321",
            email="driver@test.uz",
            password_hash=hash_password(TEST_PASSWORD),
            role="driver",
            is_verified=True,
        )
        passenger = User(
            full_name="Test Passenger",
            phone="+998901234567",
            email="passenger@test.uz",
            password_hash=hash_password(TEST_PASSWORD),
            role="passenger",
            is_verified=True,
        )
        plain = User(
            full_name="Plain User",
            phone="+998905556677",
            email="plain@test.uz",
            password_hash=hash_password(TEST_PASSWORD),
            role="passenger",
            is_verified=True,
        )
        db.add_all([admin, driver, passenger, plain])
        db.flush()

        route = Route(
            name="85-avtobus",
            type="bus",
            city="Toshkent",
            from_name="Chilonzor",
            to_name="Yunusobod",
            first_time="06:00",
            last_time="23:00",
            interval_min=8,
            price=2000,
            color="#2563eb",
        )
        db.add(route)
        db.flush()
        stop_coords = [
            ("Chilonzor", 41.2855, 69.2035),
            ("Olmazor", 41.2990, 69.2230),
            ("Amir Temur", 41.3110, 69.2790),
            ("Yunusobod", 41.3450, 69.2850),
        ]
        for index, (name, lat, lng) in enumerate(stop_coords):
            db.add(
                RouteStop(route_id=route.id, name=name, lat=lat, lng=lng, order=index)
            )

        vehicle = Vehicle(
            route_id=route.id,
            driver_id=driver.id,
            plate="01A123BC",
            category="Mikroavtobus",
            status="moving",
            lat=41.2855,
            lng=69.2035,
            speed=24.0,
            bearing=45.0,
            seats_total=16,
            seats_free=8,
        )
        db.add(vehicle)
        db.flush()

        profile = DriverProfile(
            user_id=driver.id,
            rating=4.5,
            online=True,
            vehicle_category="Mikroavtobus",
            is_approved=True,
            vehicle_id=vehicle.id,
        )
        db.add(profile)

        news_ids = []
        for index, category in enumerate(
            ["transport", "transport", "transport", "city", "city"]
        ):
            item = News(
                title=f"Yangilik {index + 1}",
                body=f"Yangilik matni {index + 1}",
                category=category,
                image_url=f"https://picsum.photos/seed/test{index}/800/450",
                views=index,
                is_pinned=index == 0,
            )
            db.add(item)
            db.flush()
            news_ids.append(item.id)

        plan = PremiumPlan(
            name="1 oy",
            price=1.0,
            currency="USD",
            duration_days=30,
            features=["Reklamasiz xarita", "Jonli harakat"],
            is_first_month_free=True,
        )
        db.add(plan)
        db.flush()

        db.add(
            Notification(
                user_id=passenger.id,
                title="Test bildirishnoma",
                body="Test body",
                is_read=False,
            )
        )
        for rating in (5, 4):
            db.add(
                Review(
                    driver_id=driver.id,
                    passenger_id=passenger.id,
                    rating=rating,
                    comment="Yaxshi",
                    status="approved",
                )
            )
        db.commit()

        return {
            "admin": admin.id,
            "driver": driver.id,
            "passenger": passenger.id,
            "plain": plain.id,
            "route": route.id,
            "vehicle": vehicle.id,
            "plan": plan.id,
            "news_ids": news_ids,
        }


@pytest.fixture(scope="session")
def tokens(seeded):
    return {
        "admin": create_access_token(seeded["admin"]),
        "driver": create_access_token(seeded["driver"]),
        "passenger": create_access_token(seeded["passenger"]),
        "plain": create_access_token(seeded["plain"]),
    }


@pytest.fixture
def auth():
    def _auth(token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    return _auth
