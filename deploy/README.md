# Deploy Scaffold: Print SaaS Platform

This folder provides a baseline to deploy the app publicly without secrets hardcoded. It includes Docker Compose for production, environment templates, and a GitHub Actions deploy workflow.

## Overview

- Services:
  - Backend (Node.js + Prisma + Postgres)
  - Frontend (Vite/React, served via preview or static server)
  - Postgres (stateful)

## Prerequisites

- Docker and Docker Compose
- Provisioned Postgres (or use the included service)
- Populate environment files under `deploy/`

## Environment Files

- See `deploy/.env.example` for compose-level variables
- See `deploy/backend.env.example` for backend service vars
- See `deploy/frontend.env.example` for frontend service vars

Copy and edit:

```bash
cp deploy/.env.example deploy/.env
cp deploy/backend.env.example deploy/backend.env
cp deploy/frontend.env.example deploy/frontend.env
```

## Database and Migrations

- Ensure `DATABASE_URL` is set in `deploy/backend.env` to match your DB.
- Run migrations inside backend container:

```bash
docker compose -f docker-compose.production.yml --env-file deploy/.env run --rm backend npm run prisma:migrate
```

> TODO: Replace `npm run prisma:migrate` with the actual migration script if different.

## Build and Run (Production)

```bash
docker compose -f docker-compose.production.yml --env-file deploy/.env up --build -d
```

## Exposed Ports

- Backend: 3000
- Frontend: 5173 (change if serving statically)
- Postgres: 5432

## Hosting Options (choose one)

- Vercel (frontend) + Render/Fly (backend)
- Fly.io for both services
- Supabase for managed Postgres

> TODO: Configure image registry and deploy strategy based on your provider.

## GitHub Actions Deploy Workflow (Optional)

See `.github/workflows/deploy.yml`. It builds images on manual dispatch. It does not push images unless you configure secrets (e.g., `REGISTRY`, `REGISTRY_USER`, `REGISTRY_PASSWORD`).
