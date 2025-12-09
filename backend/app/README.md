# Maps Reviews API

A FastAPI service that scrapes Google Maps place reviews, caches results, and exposes both public and token‑protected APIs. It supports multi‑tenant “instances”, domain allowlists for public usage, background refresh/monitoring, and multiple locales.

## Quick Start

- Install Python 3.11+ and Playwright browsers.
  - `pip install fastapi uvicorn[standard] sqlalchemy aiosqlite pydantic-settings python-jose[bcrypt] bcrypt playwright aiomysql asyncmy asyncpg`
  - `python -m playwright install chromium`
- Run the API:
  - `uvicorn app.main:app --reload`

The server starts on `http://127.0.0.1:8000`.

## Configuration

Config values come from environment variables and can be overridden by a YAML file. Load order:
1) `CONFIG_FILE` env path (if set) → 2) `config.yaml` or `config.yml` in current working directory → 3) defaults.

Example `config.yaml`:

```
app:
  # SQLite default
  database_url: "sqlite+aiosqlite:///./reviews.db"

  # MySQL (examples)
  # database_url: "mysql+aiomysql://user:pass@localhost:3306/reviews?charset=utf8mb4"
  # database_url: "mysql+asyncmy://user:pass@localhost:3306/reviews?charset=utf8mb4"

  # Postgres example
  # database_url: "postgresql+asyncpg://user:pass@localhost:5432/reviews"

  # Or compose when database_url is empty
  db_dialect: null      # mysql | postgresql | sqlite
  db_driver: null       # aiomysql | asyncmy | asyncpg | aiosqlite
  db_host: null
  db_port: null
  db_user: null
  db_password: null
  db_name: null         # for sqlite, file path e.g. ./reviews.db

  headless: true
  max_playwright_instances: 2
  cache_ttl_minutes: 1440
  monitor_poll_seconds: 60
  worker_count: 1
  default_locales: ["en-US"]
  allow_registrations: true
  admin_email: null
  admin_password: null
  jwt_secret: "devsecret-change-me"
  jwt_expire_minutes: 1440
  min_rating: 4.0
```

Notes:
- For MySQL, install an async driver (`aiomysql` or `asyncmy`). For Postgres, use `asyncpg`.
- Set `jwt_secret` in production.
- `default_locales` must match keys in `app/locales`.

## API Overview

Public endpoints (no auth):
- POST `/reviews`: scrape a place for one or more locales.
- GET `/stats`: compute aggregated stats for a place (single locale).
- GET `/public/reviews/{public_key}`: serve reviews for a user instance gated by domain allowlist.

Authentication:
- POST `/auth/register`: optional (controlled by config `allow_registrations`).
- POST `/auth/login`: returns bearer `access_token`.
- GET `/auth/me`: current user info.

Token API (per user, no public key):
- GET `/api/reviews/{instance_id}`: reviews for your instance using saved settings.
- GET `/api/stats/{instance_id}`: stats for your instance; supports `locale`, `exclude_below`, `max_reviews`, `force_refresh` query params.

Instances and domains:
- GET/POST `/instances` and PATCH/DELETE `/instances/{id}`: manage review instances (place, locales, limits, sorting).
- GET/POST `/domains` and DELETE `/domains/{id}`: manage allowed domains for public access.

Cache and refresh:
- GET `/cache`: list cache entries.
- DELETE `/cache`: delete cache entries by place and optional locales.
- POST `/refresh`: refresh a place across locales; supports background refresh and returns current cache immediately.

Monitors:
- GET/POST `/monitors` and DELETE `/monitors/{id}`: schedule periodic refreshes; a background loop (`monitor_loop`) processes due items.

## Request/Response Highlights

- Scrape request (POST `/reviews`):
  - Body: `{ place_url, locales?, force_refresh?, min_rating?, max_reviews?, sort? }`
  - `sort`: `newest | oldest | best | worst`
- Reviews response: `{ success, locale, count, averageRating, reviews[] }`
- Stats response: `{ success, place_url, locales, totalCount, averageRating, threshold?, filteredCount?, filteredAverage? }`

## Usage Examples

- Login and store token:
  - `curl -X POST -d "username=user@example.com&password=secret" http://127.0.0.1:8000/auth/login`
- Create an instance (authenticated):
  - `curl -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"place_url":"https://maps.google.com/?cid=...","locales":["en-US"],"min_rating":1.0,"max_reviews":200,"sort":"newest"}' http://127.0.0.1:8000/instances`
- Private reviews via token (no public key):
  - `curl -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8000/api/reviews/<INSTANCE_ID>`
- Public reviews via public key (with domain allowlist):
  - `curl http://127.0.0.1:8000/public/reviews/<PUBLIC_KEY>`

## Project Layout

- `app/main.py`: app assembly and startup
- `app/api/*`: route modules (auth, public, private, reviews, stats, cache, domains, monitors, instances)
- `app/auth/`: auth helpers (hashing, JWT, dependency)
- `app/config/`: settings loader (env + YAML), DB URL composition (MySQL/Postgres/SQLite)
- `app/db/`: SQLAlchemy async engine/session and Base
- `app/models/`: ORM models
- `app/schemas/`: Pydantic schemas
- `app/scraper/`: Playwright scraping
- `app/service/`: caching + orchestration
- `app/tasks/`: background loop and warmers
- `app/locales/`: supported locales

## Deployment Notes

- Run with Uvicorn/Gunicorn (ensure Playwright chromium is installed on the host/container).
- Provide `config.yaml` or environment variables. For MySQL/Postgres, ensure the database is reachable and drivers installed.
- CORS is open by default; restrict if embedding in controlled environments.

## Troubleshooting

- Playwright errors: run `python -m playwright install chromium` in the runtime environment.
- Auth 401: ensure you send `Authorization: Bearer <token>`.
- Empty/old data: adjust `cache_ttl_minutes` or use `/refresh` with `background=false` for immediate refresh.
