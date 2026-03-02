# SkuFlow OS v2 — Enterprise Architecture

## 1) High-level system diagram

```text
                           +-------------------------------+
                           |           Internet            |
                           +---------------+---------------+
                                           |
                               TLS + WAF + Rate Limits
                                           |
                                 +---------v---------+
                                 |      NGINX        |
                                 |  Reverse Proxy    |
                                 +----+---------+----+
                                      |         |
                           /api,/ws   |         |  /, /store/*, /portal
                                      |         |
                     +----------------v--+   +--v----------------+
                     |   NestJS API App  |   |  Next.js Web App  |
                     | REST + WS Gateway |   | App Router + SSR  |
                     +-----+---------+---+   +---------+----------+
                           |         |                 |
               +-----------+         +----------+      |
               |                                |      |
        +------v-------+                 +------v------+      +----------------+
        | PostgreSQL   |                 |    Redis    |<---->| BullMQ Workers |
        | Multi-tenant |                 | cache+queue |      | async jobs      |
        +------+-------+                 +------+------+      +--------+-------+
               |                                 |                      |
               +--------------+------------------+                      |
                              |                                         |
                       +------v------------------+                      |
                       | Object Storage (S3 API) |<---------------------+
                       | artwork/mockups/files   |
                       +-------------------------+
```

## 2) Microservices breakdown (logical service boundaries)

- API Gateway (NestJS monolith with modular boundaries for fast delivery)
- Pricing Engine service library (`packages/pricing-engine`) pure deterministic calculations
- Automation worker (BullMQ processor)
- File service adapter (S3/local)
- Notification worker (email/webhook dispatch)
- Vendor sync worker (ingestion, mapping, reconciliation)

## 3) Domain-driven module separation

- Identity: auth, users, roles, permissions, sessions
- Tenant Core: tenants, stores, feature flags, settings
- Commerce: products, variants, pricing, quotes, orders
- Designer: designs, layers, print areas, assets, mockups
- Operations: production jobs, workflow stages, inventory, purchasing
- Integrations: vendors, webhooks, payments, tax, shipping
- CRM: customers, companies, activity timeline, messages
- Platform: automations, notifications, audit, subscriptions

## 4) Data flows

### 4.1 Checkout flow
1. Storefront requests product/variant + pricing preview
2. Pricing Engine calculates quote snapshot
3. Customer submits cart -> order + order items transaction
4. Reserve inventory ledger rows
5. Generate invoice + payment intent
6. Emit domain events into queue for notifications and production prep

### 4.2 Proof approval flow
1. Designer saves design version
2. Quote/Order line links design
3. Proof created + customer notification
4. Customer approves in portal
5. Production job unblocked and moves to Ready

### 4.3 Production lifecycle
1. Order approved -> jobs generated from line items
2. Jobs move across stages via board or scan API
3. Printing stage consumes inventory
4. Shipping stage creates labels and tracking
5. Completion closes order and sends customer updates

## 5) Multi-tenant isolation strategy

- All business tables contain `tenantId`; store-scoped tables include `storeId`
- Every API request resolved to tenant via JWT + subdomain header resolution
- Query middleware enforces tenant predicate; admin break-glass operations audited
- Unique indexes include tenant/store where required (e.g., `tenantId + slug`)
- Background jobs carry tenant context explicitly

## 6) Subdomain routing strategy

- Admin app: `app.<root-domain>`
- Storefront: `<storeSlug>.<root-domain>` or custom domain map
- Portal: `portal.<root-domain>` + tenant/store selection by auth context
- NGINX forwards host header; backend resolves store mapping table

## 7) Database indexing strategy

- Heavy list endpoints: composite indexes on `(tenantId, updatedAt DESC, id DESC)`
- Lookup indexes on external IDs: `(tenantId, provider, externalId)`
- Event tables: `(tenantId, createdAt DESC)` and `(idempotencyKey)` unique
- Searchable entities: trigram or full-text indexes for names/emails/skus (extension optional)

## 8) Caching strategy

- Redis cache-aside for:
  - product catalog snapshots
n  - pricing rule sets
  - role/permission maps
  - store theme/config
- TTL policy: short TTL (60–300s) with event-driven invalidation on writes
- HTTP caching only on public catalog/read endpoints with ETag

## 9) Background jobs and queues

- `automation`: rule evaluation and actions
- `vendor-sync`: pull catalog/inventory from providers
- `mockup-render`: generate proof/preview assets
- `notifications`: email/SMS/webhook fanout
- `reporting`: aggregate daily analytics snapshots

## 10) File storage structure

```text
s3://bucket/
  tenants/{tenantId}/
    stores/{storeId}/
      artwork/{assetId}.{ext}
      mockups/{designId}/{version}.png
      exports/{type}/{timestamp}.csv
      proofs/{proofId}.pdf
```

## 11) Security model

- JWT access tokens (short-lived) + rotating refresh tokens
- RBAC + permission claims + tenant membership checks
- Row-level tenant filtering in service/repository layer
- Request ID propagation and structured logs
- Upload MIME/content sniffing + size limits
- Signed URLs for private assets

## 12) Threat mitigation

- SQLi: Prisma prepared statements
- XSS: output escaping + content sanitization
- CSRF: SameSite cookies + double-submit token for cookie auth flows
- SSRF: deny private CIDR in URL fetchers
- Brute force: auth rate limits + login lockbackoff
- Replay: webhook idempotency keys and signature validation window

## 13) Rate limiting plan

- Global per IP: token bucket
- Auth endpoints stricter
- Webhooks separate limits per provider key
- Burst vs sustained policies configurable by env

## 14) Audit logging plan

- Immutable `AuditEntry` table
- Record actor, entity, action, diff summary, requestId, IP, userAgent
- Admin views for filter/export
- Critical actions trigger elevated alerts

## 15) Backup + restore

- PostgreSQL PITR + daily snapshots
- Redis persistence + cold backup for critical queues
- S3 versioning + lifecycle rules
- Quarterly restore drills with checksum validation

## 16) Horizontal scaling

- Stateless API pods behind L7 proxy
- Redis shared for cache/queues
- Worker replicas per queue
- Read replicas for analytics-heavy reads
- Connection pooling and max concurrency guards

## 17) Deployment strategy

- Single VM mode via docker-compose (all services)
- Scaled mode via orchestrator-compatible containers (api/web/workers separated)
- Blue/green deployment at proxy layer
- Health checks and readiness gates required

## 18) CI/CD pipeline design

1. Lint + typecheck
2. Unit tests + pricing engine golden tests
3. Integration tests (db + api)
4. Build containers
5. Security scan (deps + image)
6. Deploy staging
7. Smoke suite
8. Manual approval
9. Deploy production + post-deploy checks

## 19) Webhook contract and reliability model

### 19.1 Management endpoints (authenticated)
- `GET /api/webhooks` list configured webhooks
- `POST /api/webhooks` create webhook (`eventType`, `endpoint`, optional `secret`)
- `PATCH /api/webhooks/:id` update endpoint/secret/status
- `DELETE /api/webhooks/:id` soft delete + deactivate
- `GET /api/webhooks/deliveries` query delivery logs
- `GET /api/webhooks/retries` query retry queue/activity logs
- `GET /api/webhooks/retries/summary` query retry aggregate backlog metrics
- `POST /api/webhooks/:id/retries/queue` enqueue retry payload
- `POST /api/webhooks/retries/dispatch` pull/process queued retries
- `POST /api/webhooks/retries/prune` remove stale retry logs by retention window
- `POST /api/webhooks/retries/:retryId/requeue` requeue a specific retry record
- `POST /api/webhooks/retries/requeue-failed` batch requeue failed retry records

### 19.2 Inbound endpoint (public)
- `POST /api/webhooks/inbound/:id`
- Accepted headers:
  - `x-webhook-secret`
  - `x-webhook-event-id`
  - `x-webhook-idempotency-key`
  - `x-webhook-signature-ts`
  - `x-webhook-signature`

### 19.3 Outbound dispatch headers
- `x-webhook-id`
- `x-webhook-event`
- `x-webhook-event-id` (when present)
- `x-webhook-attempt`
- `x-webhook-idempotency-key`
- `x-webhook-signature-ts`
- `x-webhook-signature`

### 19.4 Signature and canonical payload
- Canonical string format:
  - `${timestamp}.${eventId || ''}.${idempotencyKey}.${jsonBody}`
- HMAC algorithm: `sha256`
- Inbound validation rejects mismatched signatures and records `REJECTED_SIGNATURE` activity rows.
- Inbound validation rejects signatures outside configurable skew window (`WEBHOOK_SIGNATURE_MAX_SKEW_SECONDS`, default `300`).

### 19.5 Idempotency policy
- Inbound events dedupe on `idempotencyKey` within recent inbound activity window.
- Retry queue dedupe prevents duplicate active jobs for the same `idempotencyKey`.
- Delivery logs persist `idempotencyKey` for replay/audit traceability.

### 19.6 Retry lifecycle states
- Queue lifecycle actions in `ActivityLog`:
  - `RETRY_QUEUED` -> `RETRY_PROCESSING` -> (`RETRY_SENT` | `RETRY_FAILED`)
- Failed attempts with remaining budget are requeued with backoff.
- Backoff: linear floor (`30s * attempt`) capped at `15m`.

### 19.7 Triage runbook (operator flow)
1. Validate webhook state via `GET /api/webhooks` (active + endpoint + event type).
2. Check inbound activity (`WEBHOOK_INBOUND`):
  - `RECEIVED` = accepted
  - `REJECTED_SIGNATURE` = secret/signature/canonical mismatch
3. Verify idempotency behavior:
  - Duplicate events should resolve to same `idempotencyKey` and avoid duplicate processing.
4. Inspect delivery logs via `GET /api/webhooks/deliveries`:
  - Track `DELIVERY_SUCCESS`, `DELIVERY_RETRY`, `DELIVERY_FAILED` with response metadata.
5. Recover stuck retries:
  - enqueue: `POST /api/webhooks/:id/retries/queue`
  - process: `POST /api/webhooks/retries/dispatch`
6. Confirm outbound headers on target receiver:
  - `x-webhook-id`, `x-webhook-event`, `x-webhook-attempt`, `x-webhook-idempotency-key`, `x-webhook-signature-ts`, `x-webhook-signature`.
