# Production Deployment: Render (Backend + Postgres) + Vercel (Frontend)

This guide deploys the backend and database on Render, and the static frontend on Vercel.

## Prerequisites
- GitHub repository: AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform
- Render account
- Vercel account

## Step 1: Backend + Postgres on Render

1) Create a Postgres instance on Render:
  - Render Dashboard → New → PostgreSQL
  - Note the Internal DB URL (use the External URL if needed).

2) Create the backend web service using `render.yaml`:
  - Render Dashboard → New → Blueprint → Connect your GitHub repo
  - Select `render.yaml` at repo root
  - Service name: `print-saas-backend`
  - Environment variables:
    - `NODE_ENV=production`
    - `PORT=3000`
    - `DATABASE_URL=<Render Postgres connection string>` (set as protected/secret)

3) Build/Start commands (from `render.yaml`):
  - Build: `npm install && npm run build || true`
  - Start: `npx prisma migrate deploy && npx prisma db seed || true && npm run start || node dist/index.js`

4) Health checks:
  - `GET /__ping` returns `pong`
  - `GET /health` returns `{ status: 'ok' }`
  - `GET /ready` returns `{ ready: true }` if DB reachable

5) After deploy completes, note the public backend URL, e.g. `https://print-saas-backend.onrender.com`.

## Step 2: Frontend on Vercel

1) Create a new project on Vercel:
  - Import the same GitHub repo
  - Set Root Directory: `frontend`

2) Configure build settings:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Framework preset: `Vite`

3) Set environment variables on Vercel:
  - `VITE_API_URL=https://<Render Backend URL>/api`

4) Deploy; copy the public frontend URL (e.g., `https://print-saas-frontend.vercel.app`).

## CORS
If you lock down origins, set `CORS_ORIGINS` in backend env to your Vercel domain (comma-separated). Example:

```
CORS_ORIGINS=https://print-saas-frontend.vercel.app
```

## Optional: Single VPS Deployment
For a single host, use `docker-compose.production.yml` with `deploy/.env`:

```bash
cp deploy/.env.example deploy/.env
cp deploy/backend.env.example deploy/backend.env
cp deploy/frontend.env.example deploy/frontend.env
docker compose -f docker-compose.production.yml --env-file deploy/.env up --build -d
```

Expose ports 80/443 via Nginx, proxy to backend:3000 and serve frontend `dist`.

## Smoke Verification
After deployment:
- `curl -s https://<backend>/__ping` → `pong`
- `curl -s https://<backend>/health` → `{ status: 'ok' }`
- `curl -s https://<backend>/ready` → `{ ready: true }`
- Visit the frontend; login and basic flows should work against `VITE_API_URL`.

## CI/CD (Optional)
Run nightly E2E from GitHub Actions:

```
DISPATCH=1 bash scripts/master.sh
```

Artifacts appear under `artifacts_download/<RUN_ID>/` with Playwright report and logs.
