# ReviewsFlow – Self‑Hosted Reviews Widget

A Vite + React frontend that includes:
- A builder UI to configure your review widget.
- A lightweight embeddable widget (`widget.js` + `widget.css`) that fetches public reviews from your backend.

The widget reads settings from data attributes and calls your backend public endpoint: `GET /public/reviews/{PUBLIC_KEY}`

## Quick Start (Frontend)
- Requirements: Node 20.19+ or 22.12+ and npm.
- `cd frontend`
- Install: `npm ci`
- Dev server: `npm run dev` (opens on http://localhost:5173)
- Build both app and widget: `npm run build` (outputs to `frontend/dist/`)
- Preview production build: `npm run preview`

## Embedding the Widget
Place this snippet on any site/page where you want the reviews to appear:

```html
<div id="reviews-widget"></div>
<link rel="stylesheet" href="https://YOUR_HOST/widget.css" />
<script src="https://YOUR_HOST/widget.js"
  data-api-base="https://YOUR_HOST"
  data-instance="PUBLIC_KEY"
  data-min-rating="4"
  data-max-reviews="6"
  data-sort="newest"
></script>
```

Supported attributes:
- `data-api-base`: Base URL of your backend (required). With the provided Docker setup, the frontend proxies API paths to the backend, so use your frontend origin (e.g., `https://your-domain.com`).
- `data-instance`: Public key identifying the instance to fetch (required).
- `data-target`: Optional element id to mount into (defaults to `reviews-widget`).
- `data-min-rating`: Minimum star rating to show (default `4`).
- `data-max-reviews`: Max number of reviews to render (default `6`).
- `data-sort`: One of `newest | oldest | best | worst`.

Notes:
- The widget does not require React in the host page; it’s bundled as an IIFE.
- Ensure your backend allows the host domain and serves `GET /public/reviews/{PUBLIC_KEY}`.

## Development
- App dev: `npm run dev`
- Lint: `npm run lint`

Environment variables (optional):
- `.env.development` / `.env.production` should define `VITE_API_BASE` (e.g., `http://localhost:8480`). The app and builder read this value; dev proxy is also wired to `VITE_API_BASE`.

## Building
- `npm run build` runs two builds:
  - App build (SPA) → `dist/index.html`, `dist/assets/*`, and favicons.
  - Widget build (via `vite.widget.config.js`) → `dist/widget.js`, `dist/widget.css`.

## Docker
- Build frontend image locally:
  - `docker build -t reviewsflow-frontend ./frontend`
  - `docker run -p 4380:80 reviewsflow-frontend`
- Full stack with compose (frontend + backend + MySQL):
  - `docker compose up -d`
  - Frontend: http://localhost:4380 (public), Backend: internal (proxied by frontend)

For deployment via GHCR, publish both images and run with `docker-compose.ghcr.yml`:
-- Build and push via GitHub Actions (`.github/workflows/ghcr.yml`) or locally:
  - Backend: `docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/<OWNER>/reviewsflow-backend:latest ./backend --push`
  - Frontend: `docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/<OWNER>/reviewsflow-frontend:latest ./frontend --push`
- Run with GHCR images:
  - `set GHCR_OWNER=<OWNER>` (Windows PowerShell) or `export GHCR_OWNER=<OWNER>` (bash)
  - `docker compose -f docker-compose.ghcr.yml up -d`

## Run Via Docker (GHCR)

If you prefer to pull prebuilt images from GHCR directly:

- Pull images:
  - `docker pull ghcr.io/lisacek/reviewsflow-frontend:latest`
  - `docker pull ghcr.io/lisacek/reviewsflow-backend:latest`

- Run with Compose using GHCR images (recommended):
  - `docker compose -f docker-compose.ghcr.yml up -d`
  - Frontend: http://localhost:4380 (public), Backend: internal (proxied by frontend)
  - Note: Ensure `docker-compose.ghcr.yml` is saved in your current directory. If you didn’t clone the repo, download/save this file locally first, then run the above command from the same directory.

## Quick Install

Linux / macOS (bash):

```bash
#!/usr/bin/env bash

# Download compose file
curl -L https://raw.githubusercontent.com/lisacek/reviewsflow/refs/heads/main/docker-compose.ghcr.yml \
  -o docker-compose.ghcr.yml

# Start the stack
docker compose -f docker-compose.ghcr.yml up -d

# Open: http://<YOUR_SERVER_IP>:4380
```

Windows (PowerShell):

```powershell
# Download compose file
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/lisacek/reviewsflow/refs/heads/main/docker-compose.ghcr.yml" `
  -OutFile "docker-compose.ghcr.yml"

# Start the stack
docker compose -f docker-compose.ghcr.yml up -d

# Open: http://<YOUR_SERVER_IP>:4380
```

Notes:
- The backend is internal; the frontend proxies API calls for you.
- If you re-run later, you can pull the latest images first: `docker compose -f docker-compose.ghcr.yml pull`.

- Or run with plain Docker (advanced):
  - `docker network create reviewsflow-net`
  - Database:
    - `docker run -d --name reviewsflow-db --network reviewsflow-net -e MYSQL_DATABASE=reviews -e MYSQL_USER=reviews -e MYSQL_PASSWORD=reviews -e MYSQL_ROOT_PASSWORD=root -v reviewsflow-db:/var/lib/mysql mysql:8.0 --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`
  - Backend:
    - `docker run -d --name reviewsflow-backend --network reviewsflow-net -e DATABASE_URL=mysql+aiomysql://reviews:reviews@reviewsflow-db:3306/reviews -e HEADLESS=true -e ALLOW_REGISTRATIONS=true ghcr.io/lisacek/reviewsflow-backend:latest`
  - Frontend:
    - `docker run -d --name reviewsflow-frontend --network reviewsflow-net -p 4380:80 ghcr.io/lisacek/reviewsflow-frontend:latest`
    - Note: The frontend image reads `VITE_API_BASE` at build-time. Build it without specifying `VITE_API_BASE` (or leave it empty) so it uses same-origin paths that NGINX proxies to the backend.

NGINX config (`nginx.conf`) serves the SPA with a fallback to `index.html`.

## Project Structure
- `frontend/` – Vite + React app and widget
  - `src/` – React app, pages, components, and builder
  - `src/widget/entry.jsx` – Widget bootstrap; reads data attributes and mounts
  - `src/widget/Widget.jsx` – Widget UI; fetches from `/public/reviews/{PUBLIC_KEY}`
  - `vite.config.js` – App build config
  - `vite.widget.config.js` – Widget build config (outputs `widget.js` / `widget.css`)
  - `public/` – Static assets copied to `dist/`
- `backend/` – FastAPI backend and its Dockerfile

## Backend Expectations
- Public endpoint: `GET /public/reviews/{PUBLIC_KEY}` returns JSON payloads the widget expects.
- Domain allow‑list: Only allow requests from your permitted origins.
- CORS: Enable for the host domains embedding `widget.js`.

## Troubleshooting
- Widget 404s: Verify `widget.js` and `widget.css` exist in `dist/` and are served by your host.
- CORS errors: Confirm `data-api-base` points to the correct backend and that your backend allows the embed origin.
- No reviews: Make sure the `PUBLIC_KEY` (instance) exists server‑side and returns data.
