# Phase 16 — Production Go-Live

## Objectives
- Production guardrails: no localhost fallbacks in production, strict CORS, trust proxy, required webhook secrets.
- Real provider adapters remain mock-capable for local/dev workflows.
- Harden readiness checks for database and migration visibility.
- Finalize deployment artifacts and runbook.

## Required env
- Root: `.env.production.example`
- Backend: `backend/.env.production.example`
- Frontend: `frontend/.env.production.example`

## Deployment artifacts
- `docker-compose.production.yml`
- `deploy/nginx.production.conf`
- `docs/production-runbook.md`

## Validation
- `cd backend && npm run build`
- `cd frontend && npm run build`
- `cd backend && DATABASE_URL=... DOCTOR_ALLOW_LOCALHOST_DB=1 npm run smoke:phase16`
- `DOCTOR_ALLOW_LOCALHOST_DB=1 npm run release:check`
