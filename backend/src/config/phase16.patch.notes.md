# Phase 16 Required Runtime Patches

## app.ts
- In production:
  - `trust proxy` enforced
  - strict CORS allowlist from `CORS_ORIGINS`/`CORS_ORIGIN`
  - route-level public/auth rate limits from `PROD` config
- `/health` returns `{ ok: true }`
- `/ready` validates DB connectivity + migration table access
- Production database guardrails:
  - `DATABASE_URL` required
  - localhost DB hosts blocked unless `DOCTOR_ALLOW_LOCALHOST_DB=1`

## Webhook signature enforcement
- Payments webhook ingress:
  - prod requires `x-webhook-signature`
  - validated with `PAYMENTS_WEBHOOK_SECRET` HMAC SHA-256
- Shipping webhook ingress:
  - prod requires `x-webhook-signature`
  - validated with `SHIPPING_WEBHOOK_SECRET` HMAC SHA-256

## Observability
- Logger remains JSON in production and request IDs are included via request middleware/headers.
