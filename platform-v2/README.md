# Platform v2 (Next.js + NestJS)

## Monorepo tree

```text
platform-v2/
  apps/
    api/
      src/
        common/
        modules/
          auth/
          tenant/
          roles/
          pricing/
          designer/
          orders/
          websockets/
    web/
      app/
        app/dashboard/
        app/orders/
        app/pricing/
        app/designer/
        store/[slug]/
        portal/
  packages/
    pricing-engine/
    ui/
  prisma/
    schema.prisma
  infra/
    nginx/nginx.conf
  Dockerfile.api
  Dockerfile.web
  docker-compose.yml
  .env.example
```

## Local run

1. `cd platform-v2`
2. `npm install`
3. `docker compose up -d postgres redis`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run db:seed`
7. `npm run -w apps/api start:dev`
8. `npm run -w apps/web dev`

## API docs

- `http://localhost:4000/api/docs`

## Webhooks (current contract)

- Management (auth + tenant scoped):
  - `GET /api/webhooks`
  - `POST /api/webhooks`
  - `PATCH /api/webhooks/:id`
  - `DELETE /api/webhooks/:id`
  - `GET /api/webhooks/deliveries`
  - `POST /api/webhooks/:id/retries/queue`
  - `POST /api/webhooks/retries/dispatch`
- Public inbound receiver:
  - `POST /api/webhooks/inbound/:id`
  - Optional inbound headers:
    - `x-webhook-secret`
    - `x-webhook-event-id`
    - `x-webhook-idempotency-key`
    - `x-webhook-signature-ts`
    - `x-webhook-signature`
- Outbound dispatch headers:
  - `x-webhook-id`, `x-webhook-event`, `x-webhook-event-id`, `x-webhook-attempt`
  - `x-webhook-idempotency-key`, `x-webhook-signature-ts`, `x-webhook-signature`
- Reliability behavior:
  - Inbound dedupe and retry dedupe use `idempotencyKey`
  - Retries transition through `RETRY_QUEUED` / `RETRY_PROCESSING` / `RETRY_SENT` / `RETRY_FAILED`
  - Backoff is `30s * attempt` capped at `15m`

## Reverse proxy

- `docker compose up --build`
- App served via `http://localhost:8080`
