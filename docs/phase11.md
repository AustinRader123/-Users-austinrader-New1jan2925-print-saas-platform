# Phase 11 — Shop-Floor Production Workflow (Production V2)

## Summary

Phase 11 adds a feature-gated Production V2 workflow for shop-floor operations:

- Batch-first production orchestration (`ProductionBatch`, `ProductionBatchItem`)
- Append-only event ledger (`ProductionBatchEvent`)
- Operator assignment tracking (`ProductionAssignment`)
- Scan token workflow (`ProductionScanToken`)
- Ticket and ZIP export endpoints
- WIP board UI at `/dashboard/production-v2`

The feature gate `production_v2.enabled` is **off by default**.

## Feature Gate Behavior

- `production_v2.enabled=false`:
  - Existing legacy production queue path remains active.
  - No behavior change to existing flows.
- `production_v2.enabled=true`:
  - New orders/quote conversions/checkout confirmations route into Production V2 batch creation.
  - Fundraising consolidation auto-creates Production V2 batches for generated bulk orders.

## API Surface

Mounted at `/api/production-v2`.

- `GET /batches`
- `GET /batches/:id`
- `POST /batches/from-order/:orderId`
- `POST /batches/from-bulk-order/:bulkOrderId`
- `POST /batches/:id/assign`
- `POST /batches/:id/unassign`
- `POST /batches/:id/stage`
- `GET /batches/:id/ticket`
- `GET /batches/:id/export.zip`
- `POST /scan/:token`

## UI

Production V2 board is available at:

- `/dashboard/production-v2`
- `/app/dashboard/production-v2`

The board provides:

- Stage columns (ART → APPROVED → PRINT → CURE → PACK → SHIP → COMPLETE, plus HOLD/CANCELLED)
- Filters (tenant, stage, method, store, campaign, search)
- Batch detail panel with scan token, timeline, and assignment actions
- Ticket print and ZIP export actions

## Smoke Test

Run:

```bash
cd backend
npm run smoke:phase11
```

The script validates:

1. reset/seed/bootstrap
2. `production_v2.enabled` feature override
3. order checkout → automatic Production V2 batch creation
4. list/detail endpoints for that batch
5. scan advance creates append-only event increment
6. ticket/export endpoints
7. fundraising consolidate run creates Production V2 linkage via `fundraiserRunId`

PASS output includes tenant, order, batch, run, and fundraiser batch IDs.
