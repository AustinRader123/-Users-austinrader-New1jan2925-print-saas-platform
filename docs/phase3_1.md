# Phase 3.1: Supplier Sync Hardening, Scheduling, Observability, Exports

Phase 3.1 extends Phase 3 with discoverability, optional real-adapter hardening, scheduling, run-log observability, and CSV exports.

## Highlights

- Admin discoverability
  - Supplier Sync is reachable in admin sidebar at `/app/admin/suppliers`.
  - UI visibility is RBAC-gated to `ADMIN` and `STORE_OWNER`.
  - Supplier pages include breadcrumbs and run-detail navigation.

- Real supplier adapter hardening (optional, env-gated)
  - Enabled only when `ENABLE_REAL_SUPPLIER_ADAPTERS=true`.
  - Real adapters: `SANMAR`, `SSACTIVEWEAR`, `ALPHABRODER`.
  - HTTP behavior:
    - connection timeout target: ~3s via HTTP agent
    - max request timeout: 20s
    - retries: 3 on retryable (429/5xx/network) with exponential backoff
    - pagination support for cursor/page tokens
    - circuit-breaker per run after repeated failures
  - Connection test response shape:
    - `{ ok, latencyMs, authStatus, sampleCounts, warnings, error? }`

- Scheduled sync
  - `SupplierConnection` fields:
    - `syncEnabled`
    - `syncIntervalMinutes`
    - `syncNextAt`
    - `syncLastAttemptAt`
  - Scheduler tick (`60s`) enqueues due connections and updates schedule fields.
  - Uses Postgres advisory lock to avoid overlapping ticks.
  - Emits audit action: `supplier.sync_scheduled`.
  - Scripts:
    - `npm run supplier:scheduler`
    - `npm run supplier:scheduler:once`

- Observability
  - Each sync run writes JSONL logs to `artifacts/logs/supplier-sync/<runId>.log`.
  - Run logs are persisted to storage and linked via `SupplierSyncRun.logFileId`.
  - Download API:
    - `GET /api/suppliers/sync-runs/:runId/log`
  - Run detail UI includes counts and top errors, with log download button.

- CSV export
  - Endpoint:
    - `GET /api/suppliers/export/catalog.csv?connectionId=...`
  - Columns:
    - `productId, productName, externalProductId, variantId, color, size, sku, cost, supplierInventoryQty, imageCount, lastSyncedAt`

## Smoke

- Existing `smoke:phase3` remains passing.
- New `smoke:phase3_1` verifies:
  - admin suppliers route discoverability in route map
  - scheduled sync tick creates new run
  - run log artifact is downloadable
  - CSV export endpoint returns expected header + data rows
