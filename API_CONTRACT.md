# Bekat Uz — API Contract (v1)

Base URL: `/api/v1` — OpenAPI docs at `/docs`.

## Conventions
- Auth: `Authorization: Bearer <access_token>`
- Pagination: `?page=1&page_size=20` → response `{items: [], total, page, page_size, pages}`
- Errors: HTTP status + `{"detail": "<message>"}`
- Dates: ISO 8601 UTC. Coordinates: WGS84 `lat`/`lng` floats.
- Language: all user-facing strings in responses are Uzbek (Latin) where they are content (news titles etc.). Field names are English.

## Auth flow
1. `POST /auth/register` → creates user (status=pending) + sends 6-digit Telegram code
2. `POST /auth/verify-code` → returns tokens (auto-login)
3. `POST /auth/resend-code` (rate limited: 3/min)
4. `POST /auth/login` → tokens

### Endpoints
- `POST /auth/register`
  Body: `{full_name, phone ("+998..."), password, password_confirm, role: "passenger"|"driver", email?, vehicle_category? ("Avtobus"|"Mikroavtobus"|"Gazel"|"Yengil avto"), telegram_id?}`
  → `201 {user_id, phone, message, dev_code?}` (`dev_code` only when TELEGRAM_BOT_TOKEN not configured)
- `POST /auth/verify-code` Body `{phone, code}` → `200 {access_token, refresh_token, token_type:"bearer", user: UserOut}`
- `POST /auth/resend-code` Body `{phone}` → `200 {message, dev_code?}`
- `POST /auth/login` Body `{identifier (phone or email), password, remember?: bool}` → `200 {access_token, refresh_token, user}`
- `POST /auth/refresh` Body `{refresh}` → `{access_token}`
- `POST /auth/logout` Body `{refresh}` → `{detail}`
- `GET /auth/me` → `UserOut`
- `POST /auth/forgot-password` Body `{identifier}` → `{message, dev_token?}`
- `POST /auth/reset-password` Body `{token, new_password}` → `{detail}`

### UserOut
`{id, full_name, phone, email, role: "passenger"|"driver"|"admin", avatar_url, language: "uz"|"ru"|"en", is_verified, is_premium, is_blocked, created_at, driver?: {id, rating, online, vehicle_category, is_approved}}`

## Users
- `GET /users/me` → UserOut
- `PATCH /users/me` Body `{full_name?, email?, language?, notifications_enabled?, dark_mode?, avatar_url?}` → UserOut
- `PUT /users/me/password` Body `{old_password, new_password}` → `{detail}`

## Routes & vehicles
- `GET /routes?search=&city=` → `{items: [RouteOut]}`; RouteOut: `{id, name ("85-avtobus"), type: "bus"|"minibus"|"taxi"|"train", city, from_name, to_name, first_time, last_time, interval_min, price, stops_count, vehicles_count, color}`
- `GET /routes/{id}` → RouteOut + `{stops: [RouteStopOut {id, name, lat, lng, order}], vehicles: [VehicleOut]}`
- `GET /vehicles?route_id=&lat=&lng=&radius_km=10` → `{items: [VehicleOut]}`
- `GET /vehicles/nearby?lat=&lng=&limit=10` → `{items: [{vehicle: VehicleOut, eta_min, distance_km}]}`
- `GET /vehicles/{id}` → VehicleOut
  VehicleOut: `{id, route_id, driver_id, plate ("01A123BC"), category, status: "moving"|"idle"|"offline", lat, lng, speed, bearing, seats_total, seats_free, updated_at, route: {id, name, color, from_name, to_name}}`
- `GET /stops?route_id=` → `{items: [RouteStopOut]}`

## News
- `GET /news?category=all|transport|city|announcements&page=&page_size=&search=` → paginated `NewsOut`
  NewsOut: `{id, title, body, category, image_url, views, published_at, is_pinned}`
- `GET /news/{id}` → NewsOut (increments views)

## Reviews
- `GET /reviews?driver_id=&page=` → paginated `ReviewOut {id, driver_id, passenger_id, passenger_name, rating 1..5, comment, status: "pending"|"approved"|"rejected", created_at}`
- `POST /reviews` Body `{driver_id, rating, comment}` (auth) → 201 ReviewOut
- `GET /drivers/{id}/reviews` → `{average, distribution: {"5": n, "4": n, "3": n, "2": n, "1": n}, items: paginated ReviewOut}`

## Premium
- `GET /premium/plans` → `{items: [{id, name ("1 oy"), price, currency: "USD", duration_days, features: [str], is_first_month_free}]}`
- `GET /premium/me` → `{is_premium, plan?, expires_at?, payments: [...]}`
- `POST /premium/subscribe` Body `{plan_id, provider: "payme"|"click"}` (auth) → `{payment_id, provider, pay_url (mock), status: "pending"}`
- `POST /premium/confirm` Body `{payment_id}` (mock succeeds) → `{is_premium: true, expires_at}`
- `POST /payments/webhook/{provider}` (public, mock)

## Notifications
- `GET /notifications` → `{items: [{id, title, body, is_read, created_at}]}`
- `POST /notifications/read-all` → `{detail}`
- `POST /notifications/{id}/read` → `{detail}`

## Driver
- `GET /drivers/me` → `{id, full_name, rating, online, is_premium, vehicle_category, vehicle, today_orders: [DriverOrderOut]}`
  DriverOrderOut: `{id, route_name, from_name, to_name, time, price_som, status, passengers}`
- `PATCH /drivers/me` Body `{online?, vehicle_category?, vehicle_id?}`
- `GET /drivers/me/ratings` → same shape as `/drivers/{id}/reviews`
- `POST /drivers/me/location` Body `{lat, lng, speed, bearing}` → `{detail}` (HTTP fallback for WS)
- `GET /drivers/requests` → `{items: [{id, passenger_name, from_name, to_name, price_som, status}]}`
- `POST /drivers/requests/{id}/accept|decline`

## Admin (role=admin only)
- `GET /admin/stats` → `{users, drivers, orders, premium_subscriptions, chart: [{date, users, orders}] (last 7 days), latest_news: [NewsOut], latest_users: [UserOut]}`
- `GET|POST /admin/users`, `PATCH|DELETE /admin/users/{id}` (PATCH may set `is_blocked`)
- `GET|POST /admin/drivers`, `PATCH|DELETE /admin/drivers/{id}` (PATCH: `is_approved`, `is_blocked`)
- `GET|POST|PATCH|DELETE /admin/vehicles[/{id}]`
- `GET|POST|PATCH|DELETE /admin/routes[/{id}]` (+ stops via `stops: [{name, lat, lng, order}]`)
- `GET|POST|PATCH|DELETE /admin/news[/{id}]`
- `GET /admin/reviews`, `PATCH /admin/reviews/{id}` Body `{status}`
- `GET|POST|PATCH|DELETE /admin/plans[/{id}]`

## WebSocket
- `WS /ws/vehicles?route_id=` (public) → server pushes every 2s: `{type: "vehicles", data: [VehicleOut-lite {id, route_id, lat, lng, speed, bearing, status, updated_at}]}`
- `WS /ws/driver?token=<access>` → client sends `{type: "location", lat, lng, speed, bearing}` every 3s; server replies `{type: "ok"}` and can push `{type: "request", data: {...}}` / `{type: "message", data: {...}}`
- `WS /ws/chat?token=<access>&room=<id>` → `{type: "message", data: {id, from, text, created_at}}`
