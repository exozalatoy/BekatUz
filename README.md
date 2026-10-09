# Bekat Uz — Transport Super-App (O'zbekiston)

Avtobus, mikroavtobus, taksi va poyezdlar uchun real vaqt transport ilovasi.
Monorepo: **backend** (FastAPI) + **web** (yo'lovchi & haydovchi ilovasi) + **admin** (boshqaruv paneli).

## Texnologiyalar

| Qism | Texnologiya |
|------|-------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, JWT (access+refresh, argon2), WebSocket, aiogram (Telegram kod), Redis (yo'q bo'lsa in-memory fallback) |
| DB | PostgreSQL + PostGIS (Docker), SQLite (lokal dev/CI) |
| Web | React 19 + Vite + TypeScript, TailwindCSS v4, React Router 7, TanStack Query, Zustand, MapLibre GL JS, i18next (uz/ru/en), PWA |
| Admin | React + Vite + TS, light theme, Recharts |
| DevOps | Docker Compose (db, redis, api, web, admin) |

## Tez boshlash (Docker yo'q bo'lsa — lokal)

```powershell
# 1) Backend
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m app.scripts.migrate     # jadvallar + alembic
.venv\Scripts\python -m app.scripts.seed         # demo ma'lumotlar (Toshkent yo'nalishlari)
.venv\Scripts\uvicorn app.main:app --port 8000   # http://localhost:8000/docs

# 2) Web (yo'lovchi/haydovchi) — alohida terminal
cd web
npm install
npm run dev            # http://localhost:5173

# 3) Admin — alohida terminal
cd admin
npm install
npm run dev            # http://localhost:5174
```

`.env.example` → `.env` nusxa oling (Telegram bot token ixtiyoriy — dev'da kod konsolga/`dev_code` sifatida chiqadi).

## Docker Compose

```powershell
copy .env.example .env
docker compose up --build
```

- api → http://localhost:8000 (OpenAPI: `/docs`)
- web → http://localhost:5173
- admin → http://localhost:5174
- db → PostGIS 16, redis → 7

## Demo hisoblar

| Rol | Login | Parol |
|-----|-------|-------|
| Admin | admin@bekatuz.uz | Admin123! |
| Yo'lovchi (Premium) | +998901234567 | Passenger123! |
| Haydovchi | +998907654321 | Driver123! |

Telegram bot token bo'lmasa, ro'yxatdan o'tganda 6-xonali kod javobda `dev_code` ko'rinishida keladi.

## API qisqacha

- REST: `/api/v1/...` (auth, routes, vehicles, news, reviews, premium, notifications, driver, admin)
- WebSocket: `/ws/vehicles` (jonli transport pozitsiyalari, 2s), `/ws/driver` (haydovchi GPS), `/ws/chat`
- Batafsil: [`API_CONTRACT.md`](API_CONTRACT.md)

## Seed ma'lumotlari

Toshkent yo'nalishlari: **85-avtobus** (Chilonzor–Yunusobod), **18-mikrobus** (Sergeli–Markaz), **Gazel Yunusobod-Markaz**, **42-avtobus**, **73-mikrobus**, **Toshkent–Samarqand poyezd** — har birida 6–10 bekat va 2–4 jonli transport.
Transportlar simulatori (`SIMULATE_VEHICLES=true`) har 2 soniyada pozitsiyani yangilaydi → xaritada jonli harakat.

## Testlar

```powershell
cd backend
.venv\Scripts\python -m pytest      # 45 test
```

Frontend: `npm run build` (web va admin ikkalasi ham 0 xato bilan build bo'ladi).

## Struktura

```
/backend   app/{api,models,schemas,services,core}, alembic, scripts, tests
/web       yo'lovchi + haydovchi ilovasi (dark, mobile-first, PWA)
/admin     admin panel (light)
```
