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
  - `GET /api/webhooks/retries`
  - `GET /api/webhooks/retries/summary`
  - `POST /api/webhooks/:id/retries/queue`
  - `POST /api/webhooks/retries/dispatch`
  - `POST /api/webhooks/retries/prune`
  - `POST /api/webhooks/retries/:retryId/requeue`
  - `POST /api/webhooks/retries/requeue-failed`
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
  - Signature timestamp window enforced via `WEBHOOK_SIGNATURE_MAX_SKEW_SECONDS` (default `300`)

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
  - Monitor backlog: `GET /api/webhooks/retries/summary?webhookId=<id>&hours=24`
  - Inspect queue state: `GET /api/webhooks/retries?webhookId=<id>&status=QUEUED`
  - Queue if missing: `POST /api/webhooks/:id/retries/queue`
  - Requeue a specific failed item: `POST /api/webhooks/retries/<retryId>/requeue`
  - Batch requeue failed items: `POST /api/webhooks/retries/requeue-failed`
  - Process queue: `POST /api/webhooks/retries/dispatch`
  - Re-run dispatch until retries resolve to `RETRY_SENT` or terminal `RETRY_FAILED`.
6. Prune old retry logs (retention)
  - `POST /api/webhooks/retries/prune` with `{ "olderThanDays": 30 }`
  - Optional scope: `{ "webhookId": "<id>", "olderThanDays": 30 }`
7. Header verification during endpoint debugging
  - Outbound should include: `x-webhook-id`, `x-webhook-event`, `x-webhook-attempt`, `x-webhook-idempotency-key`, `x-webhook-signature-ts`, `x-webhook-signature`.
8. Common root causes
  - Signature mismatch: secret rotated or canonical payload mismatch.
  - Perma-fail retries: endpoint unreachable or consistently non-2xx response.
  - Requeue loops: max attempts too low/high or endpoint contract mismatch.

## Webhook smoke script

- Script: `scripts/webhook-smoke.sh`
- Purpose:
  - create (or use) webhook,
  - enqueue retry job,
  - verify duplicate queue idempotency behavior,
  - print retry queue state pre/post dispatch,
  - exercise manual requeue and batch `requeue-failed` recovery endpoints,
  - dispatch retries,
  - print latest delivery logs and IDs.
- Quick use (with existing token):
  - `cd platform-v2 && TOKEN=<jwt> TENANT_ID=<tenant> API_BASE=http://localhost:4000 npm run webhook:smoke`
- Quick use (login flow):
  - `cd platform-v2 && EMAIL=<user> PASSWORD=<pass> TENANT_ID=<tenant> API_BASE=http://localhost:4000 npm run webhook:smoke`
- Shortcut aliases:
  - Local API default: `cd platform-v2 && TOKEN=<jwt> TENANT_ID=<tenant> npm run webhook:smoke:local`
  - Local fail path (forces delivery failures): `cd platform-v2 && TOKEN=<jwt> TENANT_ID=<tenant> npm run webhook:smoke:failpath`
  - Production API default: `cd platform-v2 && TOKEN=<jwt> TENANT_ID=<tenant> npm run webhook:smoke:prod`
- Useful overrides:
  - `WEBHOOK_ID=<id>` reuse existing webhook
  - `TARGET_URL=https://httpbin.org/post` destination endpoint
  - `EVENT_TYPE=order.updated` event type
  - `MAX_ATTEMPTS=3` retry budget
  - `REQUEUE_FAILED_LIMIT=10` batch failed requeue cap

## Reverse proxy

- `docker compose up --build`
- App served via `http://localhost:8080`
