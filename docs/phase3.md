# Phase 3: Supplier Catalog Sync

Phase 3 adds supplier catalog synchronization with idempotent mappings, image mirroring, and run logging.

## Delivered

- Supplier domain models in Prisma:
  - `SupplierConnection`
  - `ExternalProductMap`
  - `ExternalVariantMap`
  - `ExternalImageMap`
  - `SupplierSyncRun`
  - `SupplierSyncRunError`
- Supplier adapter interface and adapters:
  - `MOCK` adapter (fixture catalog, no external credentials required)
  - HTTP-based stubs for `SANMAR`, `SSACTIVEWEAR`, `ALPHABRODER`
- Sync engine:
  - Product/variant upsert by external ID maps
  - Price/inventory updates (`cost`, `supplierCost`, `price`, `inventoryQty`, `supplierInventoryQty`)
  - Image mirroring to local storage and `FileAsset` records (`SUPPLIER_IMAGE`)
  - Run count metrics and error logging
- Background queue:
  - In-process queue with retries/backoff
  - Pending `QUEUED` runs are re-enqueued at boot
- Admin API:
  - CRUD supplier connections
  - Test connection
  - Start sync (queued or inline)
  - List sync runs and run details
- Frontend admin page:
  - `/app/admin/suppliers` for connection creation/testing/sync and run visibility
- Seed:
  - Default `MOCK` supplier connection is created idempotently when available
- Smoke:
  - `backend/scripts/smoke-phase3.sh`
  - `npm run smoke:phase3`

## API Endpoints

All endpoints are mounted under `/api/admin` and require admin auth.

- `GET /suppliers/connections`
- `POST /suppliers/connections`
- `PATCH /suppliers/connections/:connectionId`
- `DELETE /suppliers/connections/:connectionId`
- `POST /suppliers/connections/:connectionId/test`
- `POST /suppliers/connections/:connectionId/sync`
- `GET /suppliers/runs`
- `GET /suppliers/runs/:runId`

Request scoping uses `storeId` from token when present, otherwise accepts `storeId` from query/body.

## Smoke Validation

Run:

```bash
cd backend
npm run smoke:phase3
```

The smoke script verifies:

1. Admin can create/find mock supplier connection.
2. Connection test succeeds.
3. First sync succeeds and imports products/variants/images.
4. Second sync is idempotent (no new product/variant creates).
5. Sync run logs and external maps exist in DB.
