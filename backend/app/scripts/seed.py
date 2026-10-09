import logging
from datetime import datetime, timedelta

from sqlalchemy import func, select

from app.core.database import Base, SessionLocal, engine, utcnow
from app.core.security import hash_password
from app.models import (
    DriverProfile,
    LocationPing,
    News,
    Notification,
    PremiumPlan,
    Review,
    Route,
    RouteStop,
    Subscription,
    Trip,
    User,
    Vehicle,
)

logger = logging.getLogger("bekatuz")

CITY = "Toshkent"

ROUTE_DATA = [
    {
        "name": "85-avtobus",
        "type": "bus",
        "city": CITY,
        "from_name": "Chilonzor",
        "to_name": "Yunusobod",
        "first_time": "06:00",
        "last_time": "23:00",
        "interval_min": 8,
        "price": 2000,
        "color": "#2563eb",
        "stops": [
            ("Chilonzor metrosi", 41.2855, 69.2035),
            ("Bunyodkor shoh ko'chasi", 41.2900, 69.2110),
            ("Olmazor", 41.2990, 69.2230),
            ("Beruniy", 41.3040, 69.2350),
            ("Tinchlik", 41.3100, 69.2470),
            ("Mustaqillik shoh ko'chasi", 41.3150, 69.2620),
            ("Amir Temur xiyoboni", 41.3110, 69.2790),
            ("Yunusobod", 41.3450, 69.2850),
        ],
        "vehicles": [
            ("01A123BC", "Avtobus"),
            ("01A456DE", "Avtobus"),
            ("01A789FG", "Avtobus"),
        ],
    },
    {
        "name": "18-mikrobus",
        "type": "minibus",
        "city": CITY,
        "from_name": "Sergeli",
        "to_name": "Markaz",
        "first_time": "06:30",
        "last_time": "22:30",
        "interval_min": 5,
        "price": 3000,
        "color": "#16a34a",
        "stops": [
            ("Sergeli", 41.2400, 69.2250),
            ("Oltintepa", 41.2700, 69.2150),
            ("Chilonzor", 41.2855, 69.2035),
            ("Bunyodkor", 41.2900, 69.2110),
            ("Olmazor", 41.2990, 69.2230),
            ("Pushkin", 41.3080, 69.2600),
            ("Markaz", 41.3110, 69.2790),
        ],
        "vehicles": [
            ("01J777AA", "Mikroavtobus"),
            ("01B234CD", "Mikroavtobus"),
            ("01B567EF", "Mikroavtobus"),
        ],
    },
    {
        "name": "Gazel Yunusobod-Markaz",
        "type": "taxi",
        "city": CITY,
        "from_name": "Yunusobod",
        "to_name": "Markaz",
        "first_time": "06:00",
        "last_time": "23:30",
        "interval_min": 4,
        "price": 5000,
        "color": "#f59e0b",
        "stops": [
            ("Yunusobod", 41.3450, 69.2850),
            ("Minor", 41.3300, 69.2740),
            ("Buyuk Ipak Yo'li", 41.3200, 69.2680),
            ("Abay", 41.3160, 69.2720),
            ("Amir Temur xiyoboni", 41.3110, 69.2790),
            ("Markaz", 41.3080, 69.2750),
        ],
        "vehicles": [
            ("01C111AA", "Gazel"),
            ("01C222BB", "Gazel"),
            ("01C333CC", "Gazel"),
            ("01C444DD", "Gazel"),
        ],
    },
    {
        "name": "Toshkent-Samarqand poyezd",
        "type": "train",
        "city": "Respublika",
        "from_name": "Toshkent",
        "to_name": "Samarqand",
        "first_time": "07:00",
        "last_time": "18:00",
        "interval_min": 180,
        "price": 120000,
        "color": "#dc2626",
        "stops": [
            ("Toshkent vokzali", 41.2790, 69.2930),
            ("Yangiyo'l", 41.0500, 69.0500),
            ("Sirdaryo", 40.8500, 68.6600),
            ("Guliston", 40.4900, 68.8000),
            ("Jizzax", 40.0700, 67.8400),
            ("Samarqand vokzali", 39.6500, 66.9600),
        ],
        "vehicles": [
            ("01T901AF", "Poyezd"),
            ("01T902AF", "Poyezd"),
        ],
    },
    {
        "name": "42-avtobus",
        "type": "bus",
        "city": CITY,
        "from_name": "Mirzo Ulug'bek",
        "to_name": "Chilonzor",
        "first_time": "06:00",
        "last_time": "22:00",
        "interval_min": 10,
        "price": 2000,
        "color": "#7c3aed",
        "stops": [
            ("Mirzo Ulug'bek", 41.3250, 69.3350),
            ("Bog'ishamol", 41.3150, 69.3200),
            ("Ming O'rik", 41.3200, 69.3000),
            ("Buyuk Ipak Yo'li", 41.3200, 69.2680),
            ("Abay", 41.3160, 69.2720),
            ("Olmazor", 41.2990, 69.2230),
            ("Chilonzor", 41.2855, 69.2035),
        ],
        "vehicles": [
            ("01D555EE", "Avtobus"),
            ("01D666FF", "Avtobus"),
        ],
    },
    {
        "name": "73-mikrobus",
        "type": "minibus",
        "city": CITY,
        "from_name": "Olmazor",
        "to_name": "Yunusobod",
        "first_time": "06:15",
        "last_time": "22:45",
        "interval_min": 7,
        "price": 3000,
        "color": "#0891b2",
        "stops": [
            ("Olmazor", 41.2990, 69.2230),
            ("Beruniy", 41.3040, 69.2350),
            ("Tinchlik", 41.3100, 69.2470),
            ("Mustaqillik", 41.3150, 69.2620),
            ("Amir Temur", 41.3110, 69.2790),
            ("Yunusobod", 41.3450, 69.2850),
        ],
        "vehicles": [
            ("01E777GG", "Mikroavtobus"),
            ("01E888HH", "Mikroavtobus"),
            ("01E999II", "Mikroavtobus"),
        ],
    },
]

NEWS_DATA = [
    {
        "title": "Toshkentda yangi 85-avtobus yo'nalishi ishga tushdi",
        "body": "Chilonzor va Yunusobod tumanlarini bog'lovchi 85-avtobus yo'nalishi bugundan boshlab qatnovga chiqdi. Avtobuslar har 8 daqiqada qatnaydi.",
        "category": "transport",
        "is_pinned": True,
    },
    {
        "title": "Metro bekati yaqinida yangi avtoturargoh ochildi",
        "body": "Shahar markazidagi metro bekati yaqinida 200 o'rinli zamonaviy avtoturargoh foydalanishga topshirildi.",
        "category": "city",
        "is_pinned": False,
    },
    {
        "title": "Mikroavtobuslarda to'lov tizimi yangilandi",
        "body": "Endi barcha shahar mikroavtobuslarida bank kartasi va QR-kod orqali to'lov qilish mumkin.",
        "category": "transport",
        "is_pinned": False,
    },
    {
        "title": "Bayram kunlari jadval o'zgaradi",
        "body": "Mustaqillik kuni munosabati bilan jamoat transporti maxsus jadval bo'yicha ishlaydi. Batafsil ma'lumot ilovada.",
        "category": "announcements",
        "is_pinned": True,
    },
    {
        "title": "Toshkent-Samarqand poyezdi qatnovi tezlashtirildi",
        "body": "Afrosiyob poyezdi endi Toshkentdan Samarqandga 2 soat 10 daqiqada yetib boradi.",
        "category": "transport",
        "is_pinned": False,
    },
    {
        "title": "Shahar ko'chalarida ta'mirlash ishlari",
        "body": "Bir nechta ko'chalarda yo'l ta'mirlash ishlari olib borilmoqda. Haydovchilardan ehtiyot bo'lish so'raladi.",
        "category": "city",
        "is_pinned": False,
    },
    {
        "title": "Bekat Uz ilovasida premium tarif ishga tushdi",
        "body": "Premium foydalanuvchilar uchun reklamasiz xarita va cheksiz marshrut tarixi mavjud.",
        "category": "announcements",
        "is_pinned": False,
    },
    {
        "title": "Elektrobuslar soni ko'paymoqda",
        "body": "Shahar yo'nalishlarida elektrobuslar soni 50 taga yetkazildi. Bu havo ifloslanishini kamaytirishga yordam beradi.",
        "category": "transport",
        "is_pinned": False,
    },
    {
        "title": "Yangi to'xtash joylari jihozlandi",
        "body": "Bir nechta jamoat transporti to'xtash joylarida yoritish va elektron tablo o'rnatildi.",
        "category": "city",
        "is_pinned": False,
    },
]

REVIEW_DATA = [
    (5, "Juda yaxshi haydovchi, mashina toza va tez yetib bordik."),
    (5, "Xizmat a'lo darajada, rahmat!"),
    (4, "Yaxshi, faqat bir oz kechikdi."),
    (5, "Muloyim muomala, xavfsiz haydash uchun rahmat."),
    (4, "Narxi arzon, xizmat yaxshi."),
    (5, "Tez va qulay, albatta yana foydalanaman."),
    (4, "Yaxshi tajriba bo'ldi, tavsiya qilaman."),
]


def already_seeded(db) -> bool:
    return (db.scalar(select(func.count(User.id))) or 0) > 0


def seed() -> None:
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        if already_seeded(db):
            print("Seed skipped: database already contains users")
            return

        now = utcnow()

        admin = User(
            full_name="Bekat Uz Admin",
            phone="+998900000000",
            email="admin@bekatuz.uz",
            password_hash=hash_password("Admin123!"),
            role="admin",
            is_verified=True,
            language="uz",
            created_at=now - timedelta(days=30),
        )
        passenger = User(
            full_name="Ali Valiyev",
            phone="+998901234567",
            email="ali@example.com",
            password_hash=hash_password("Passenger123!"),
            role="passenger",
            is_verified=True,
            is_premium=True,
            premium_expires_at=now + timedelta(days=30),
            language="uz",
            created_at=now - timedelta(days=12),
        )
        driver = User(
            full_name="Jasur Toshmatov",
            phone="+998907654321",
            email="jasur@example.com",
            password_hash=hash_password("Driver123!"),
            role="driver",
            is_verified=True,
            language="uz",
            created_at=now - timedelta(days=20),
        )
        extra_one = User(
            full_name="Dilnoza Karimova",
            phone="+998901112233",
            password_hash=hash_password("User1234!"),
            role="passenger",
            is_verified=True,
            created_at=now - timedelta(days=6),
        )
        extra_two = User(
            full_name="Sardor Rahimov",
            phone="+998902223344",
            password_hash=hash_password("User1234!"),
            role="passenger",
            is_verified=True,
            created_at=now - timedelta(days=2),
        )
        db.add_all([admin, passenger, driver, extra_one, extra_two])
        db.flush()

        driver_profile = DriverProfile(
            user_id=driver.id,
            rating=4.8,
            online=True,
            vehicle_category="Mikroavtobus",
            is_approved=True,
        )
        db.add(driver_profile)
        db.flush()

        route_objects: dict[str, Route] = {}
        vehicle_objects: dict[str, Vehicle] = {}
        for route_data in ROUTE_DATA:
            route = Route(
                name=route_data["name"],
                type=route_data["type"],
                city=route_data["city"],
                from_name=route_data["from_name"],
                to_name=route_data["to_name"],
                first_time=route_data["first_time"],
                last_time=route_data["last_time"],
                interval_min=route_data["interval_min"],
                price=route_data["price"],
                color=route_data["color"],
            )
            db.add(route)
            db.flush()
            route_objects[route.name] = route
            for index, (name, lat, lng) in enumerate(route_data["stops"]):
                db.add(
                    RouteStop(
                        route_id=route.id, name=name, lat=lat, lng=lng, order=index
                    )
                )
            first_stop = route_data["stops"][0]
            for plate, category in route_data["vehicles"]:
                vehicle = Vehicle(
                    route_id=route.id,
                    plate=plate,
                    category=category,
                    status="moving",
                    lat=first_stop[1],
                    lng=first_stop[2],
                    speed=24.0,
                    bearing=0.0,
                    seats_total=16 if category != "Avtobus" else 40,
                    seats_free=8 if category != "Avtobus" else 20,
                    updated_at=now,
                )
                db.add(vehicle)
                db.flush()
                vehicle_objects[plate] = vehicle

        driver_vehicle = vehicle_objects["01J777AA"]
        driver_vehicle.driver_id = driver.id
        driver_profile.vehicle_id = driver_vehicle.id
        driver_vehicle.speed = 28.0

        mikrobus_route = route_objects["18-mikrobus"]
        trips = [
            Trip(
                driver_id=driver.id,
                passenger_id=passenger.id,
                route_id=mikrobus_route.id,
                from_name="Sergeli",
                to_name="Markaz",
                time=now - timedelta(hours=3),
                price_som=3000,
                status="completed",
                passengers=3,
                created_at=now - timedelta(hours=3),
            ),
            Trip(
                driver_id=driver.id,
                passenger_id=extra_one.id,
                route_id=mikrobus_route.id,
                from_name="Chilonzor",
                to_name="Markaz",
                time=now - timedelta(hours=2),
                price_som=3000,
                status="completed",
                passengers=2,
                created_at=now - timedelta(hours=2),
            ),
            Trip(
                driver_id=driver.id,
                passenger_id=extra_two.id,
                route_id=mikrobus_route.id,
                from_name="Olmazor",
                to_name="Pushkin",
                time=now - timedelta(minutes=40),
                price_som=3000,
                status="in_progress",
                passengers=1,
                created_at=now - timedelta(minutes=40),
            ),
            Trip(
                driver_id=driver.id,
                passenger_id=passenger.id,
                route_id=mikrobus_route.id,
                from_name="Sergeli",
                to_name="Chilonzor",
                time=now + timedelta(hours=1),
                price_som=3500,
                status="pending",
                passengers=2,
                created_at=now - timedelta(minutes=5),
            ),
            Trip(
                driver_id=driver.id,
                passenger_id=extra_one.id,
                route_id=mikrobus_route.id,
                from_name="Pushkin",
                to_name="Markaz",
                time=now + timedelta(hours=2),
                price_som=3500,
                status="pending",
                passengers=1,
                created_at=now - timedelta(minutes=2),
            ),
        ]
        db.add_all(trips)

        for offset, (rating, comment) in enumerate(REVIEW_DATA):
            reviewer = [passenger, extra_one, extra_two][offset % 3]
            db.add(
                Review(
                    driver_id=driver.id,
                    passenger_id=reviewer.id,
                    rating=rating,
                    comment=comment,
                    status="approved",
                    created_at=now - timedelta(days=offset + 1),
                )
            )

        for index, item in enumerate(NEWS_DATA):
            db.add(
                News(
                    title=item["title"],
                    body=item["body"],
                    category=item["category"],
                    image_url=f"https://picsum.photos/seed/bekatuz{index + 1}/800/450",
                    views=(index + 1) * 17,
                    is_pinned=item["is_pinned"],
                    published_at=now - timedelta(days=index),
                    updated_at=now - timedelta(days=index),
                )
            )

        plan_month = PremiumPlan(
            name="1 oy",
            price=1.0,
            currency="USD",
            duration_days=30,
            features=["Reklamasiz xarita", "Jonli harakat", "Cheksiz marshrut tarixi"],
            is_first_month_free=True,
        )
        plan_quarter = PremiumPlan(
            name="3 oy",
            price=2.5,
            currency="USD",
            duration_days=90,
            features=["Reklamasiz xarita", "Jonli harakat", "Cheksiz marshrut tarixi"],
            is_first_month_free=False,
        )
        plan_year = PremiumPlan(
            name="12 oy",
            price=9.0,
            currency="USD",
            duration_days=365,
            features=[
                "Reklamasiz xarita",
                "Jonli harakat",
                "Cheksiz marshrut tarixi",
                "Bonus 1 oy",
            ],
            is_first_month_free=False,
        )
        db.add_all([plan_month, plan_quarter, plan_year])
        db.flush()

        db.add(
            Subscription(
                user_id=passenger.id,
                plan_id=plan_month.id,
                name=plan_month.name,
                price=plan_month.price,
                currency=plan_month.currency,
                duration_days=plan_month.duration_days,
                provider="payme",
                status="active",
                starts_at=now,
                expires_at=now + timedelta(days=30),
            )
        )

        db.add_all(
            [
                Notification(
                    user_id=passenger.id,
                    title="Premium faollashtirildi",
                    body="Premium tarifingiz 30 kun uchun faollashtirildi.",
                    is_read=False,
                    created_at=now - timedelta(days=1),
                ),
                Notification(
                    user_id=passenger.id,
                    title="Yangi yangilik",
                    body="Toshkentda yangi 85-avtobus yo'nalishi ishga tushdi.",
                    is_read=False,
                    created_at=now - timedelta(hours=5),
                ),
                Notification(
                    user_id=passenger.id,
                    title="Buyurtma qabul qilindi",
                    body="Haydovchi buyurtmangizni qabul qildi.",
                    is_read=True,
                    created_at=now - timedelta(hours=2),
                ),
                Notification(
                    user_id=driver.id,
                    title="Bugungi reja",
                    body="Bugun 5 ta buyurtma rejalashtirilgan.",
                    is_read=False,
                    created_at=now - timedelta(hours=6),
                ),
                Notification(
                    user_id=admin.id,
                    title="Yangi foydalanuvchilar",
                    body="Kun davomida 2 ta yangi foydalanuvchi ro'yxatdan o'tdi.",
                    is_read=False,
                    created_at=now - timedelta(hours=3),
                ),
            ]
        )

        for offset in range(3):
            db.add(
                LocationPing(
                    driver_id=driver.id,
                    vehicle_id=driver_vehicle.id,
                    lat=driver_vehicle.lat + offset * 0.0005,
                    lng=driver_vehicle.lng + offset * 0.0005,
                    speed=24.0 + offset,
                    bearing=45.0,
                    created_at=now - timedelta(minutes=offset * 5),
                )
            )

        db.commit()
        print("Seed completed successfully")
        print("  admin    : admin@bekatuz.uz / Admin123!")
        print("  passenger: +998901234567 / Passenger123!")
        print("  driver   : +998907654321 / Driver123!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
