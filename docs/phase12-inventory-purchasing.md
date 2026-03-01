# Phase 12: Inventory + Purchasing (Production V2 Integration)

## Summary

Phase 12 introduces a feature-gated inventory and purchasing layer for Production V2.

- Feature gate: `inventory.enabled` (default `false`)
- Backward compatibility: legacy `/api/inventory` and `/api/purchase-orders` behavior remains available when the gate is off
- New capability scope:
  - store-scoped locations and SKU catalog
  - append-only inventory ledger
  - deterministic, idempotent reservations per `batchId + skuId`
  - purchasing PO lifecycle with partial receiving and stock receipt
  - Production V2 guardrail on `PRINT` stage for low stock / unmapped materials

## Data Model (Prisma)

New enums:
- `ProductionInventoryStatus`
- `InventoryLocationType`
- `InventoryLedgerType`
- `InventoryRefType`
- `InventoryReservationStatus`

New models:
- `InventoryLocation`
- `InventorySku`
- `InventoryStock`
- `InventoryLedgerEntry`
- `InventoryReservation`
- `ProductMaterialMap`

Extended models:
- `ProductionBatch.inventoryStatus`
- `PurchaseOrder.sentAt`, `PurchaseOrder.receivedAt`
- `PurchaseOrderLine.skuId`, `PurchaseOrderLine.unitCostCents`, `PurchaseOrderLine.expectedAt`

## API

### Inventory V2 (feature-gated)

Base: `/api/inventory`

- `GET /locations`
- `POST /locations`
- `GET /skus`
- `POST /skus`
- `GET /materials`
- `POST /materials`
- `GET /stocks`
- `POST /stocks/adjust`
- `POST /batches/:batchId/reserve`
- `POST /batches/:batchId/release`
- `POST /batches/:batchId/consume`
- `GET /batches/:batchId/reservations`

### Purchasing V2 (feature-gated)

Base: `/api/purchasing`

- `GET /pos`
- `GET /pos/:id`
- `POST /pos`
- `POST /pos/:id/lines`
- `POST /pos/:id/send`
- `POST /pos/:id/receive`
- `POST /pos/:id/close`

### Production V2 additions (feature-gated)

Base: `/api/production-v2`

- `GET /batches/:id/inventory`
- `POST /batches/:id/inventory/reserve`
- `POST /batches/:id/inventory/release`

## Production V2 behavior

When `inventory.enabled=true`:

1. Batch creation from order or fundraiser bulk order attempts auto-reservation using product material maps.
2. Stage transition to `PRINT` is blocked if inventory is `LOW_STOCK` or `NOT_MAPPED`.
3. Stage transition to `CURE` consumes held reservations from stock.
4. Stage transition to `CANCELLED` releases held reservations.

## Frontend

New dashboard pages:
- `/dashboard/inventory`
- `/dashboard/purchasing`

Production V2 board enhancements:
- inventory status surfaced per batch
- reserve/release controls in batch detail
- reservation list in batch detail

## Smoke test

- Script: `backend/scripts/smoke-phase12.sh`
- Package script: `npm run smoke:phase12`
- Validates:
  - inventory setup + stock adjustment
  - order → batch reservation + print/cure inventory path
  - purchasing send/receive and stock receipt
