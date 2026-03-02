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

## Webhook runbook (triage)

1. Validate webhook config
  - `GET /api/webhooks` and confirm target `id` is active, endpoint is correct, and provider/event type match.
2. Check inbound acceptance vs rejection
  - Review inbound activity for `WEBHOOK_INBOUND` actions:
    - `RECEIVED` means accepted.
    - `REJECTED_SIGNATURE` means secret/signature mismatch.
3. Confirm dedupe behavior
  - For repeated deliveries, verify `idempotencyKey` in inbound/retry payloads.
  - Duplicate inbound events should return `accepted: true` with `duplicate: true`.
4. Inspect delivery outcomes
  - `GET /api/webhooks/deliveries?webhookId=<id>`
  - Look for `DELIVERY_SUCCESS`, `DELIVERY_RETRY`, `DELIVERY_FAILED` and check `responseCode`, `latencyMs`, and `error`.
5. Unstick queued retries
  - Queue if missing: `POST /api/webhooks/:id/retries/queue`
  - Process queue: `POST /api/webhooks/retries/dispatch`
  - Re-run dispatch until retries resolve to `RETRY_SENT` or terminal `RETRY_FAILED`.
6. Header verification during endpoint debugging
  - Outbound should include: `x-webhook-id`, `x-webhook-event`, `x-webhook-attempt`, `x-webhook-idempotency-key`, `x-webhook-signature-ts`, `x-webhook-signature`.
7. Common root causes
  - Signature mismatch: secret rotated or canonical payload mismatch.
  - Perma-fail retries: endpoint unreachable or consistently non-2xx response.
  - Requeue loops: max attempts too low/high or endpoint contract mismatch.

## Reverse proxy

- `docker compose up --build`
- App served via `http://localhost:8080`
