# Production Runbook (Phase 16)

## Preflight
- Use `.env.production.example` as baseline and fill all required secrets.
- Ensure `DATABASE_URL` points to managed Postgres (non-localhost).
- Confirm provider modes and webhook secrets are set.

## Deploy
1. Build and start stack:
   - `docker compose -f docker-compose.production.yml --env-file .env.production up -d --build`
2. Apply database migrations:
   - `docker compose -f docker-compose.production.yml --env-file .env.production exec backend npm run db:deploy`
3. Seed baseline data (idempotent):
   - `docker compose -f docker-compose.production.yml --env-file .env.production exec backend npm run db:seed`

## Verify
- Health: `GET /health`
- Readiness: `GET /ready`
- Public API: `GET /api/public/products?storeSlug=default`
- Webhook ingress in prod must include valid `x-webhook-signature`.

## Rollback
- Roll back app image/tag to previous release.
- If schema rollback is required, use forward-fix migration strategy.
- Re-run readiness checks.

## Backups
- Snapshot DB before deploy.
- Verify restore process regularly with a staging restore drill.
