# Phase 2A: Catalog, Pricing, Quotes

This implementation delivers a non-interactive, deterministic Phase 2A baseline across schema, seed data, backend APIs, and dashboard UI.

## Non-Interactive DB Workflow

Use only these commands:

- `cd backend && npm run db:deploy` (CI/prod migrations)
- `cd backend && npm run db:reset` (local reset + seed)
- `cd backend && npm run db:seed` (idempotent seed)

No automation path uses `prisma migrate dev`.

## Schema and Drift Reconciliation

Added migrations:

- `backend/prisma/migrations/20260228100000_reconcile-product-columns`
  - Adds `Product.externalId` and `Product.connectionId` if missing
  - Adds safe unique index for `connectionId + externalId`
- `backend/prisma/migrations/20260228101000_phase2a_contract_alignment`
  - Adds Phase 2A contract fields for products/variants/images/pricing/quotes
  - Backfills non-null scoped fields (`PricingRule.storeId`, `QuoteLineItem.storeId`)
  - Adds `QuoteStatus.DECLINED`

## Seed Behavior

`backend/src/db/seed.ts` is idempotent and now always creates:

- tenant/admin/store bootstrap
- 2 products
- 10 total variants (5 each)
- 7 total images (3 + 4)
- default active `PricingRuleSet` with starter rules

Seed output includes IDs and catalog counts:

- tenant/admin/store/ruleset IDs
- products count
- variants count
- images count

## API Surface

All endpoints require auth and enforce `storeId` scoping.

### Catalog

- `GET /api/products?storeId=...`
- `POST /api/products`
- `GET /api/products/:id?storeId=...`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

Variants:

- `POST /api/products/:id/variants`
- `PUT /api/variants/:id`
- `DELETE /api/variants/:id`

Images:

- `GET /api/products/:id/images?storeId=...`
- `POST /api/products/:id/images` (supports either `url` or `fileContentBase64 + fileName` via storage adapter)
- `PUT /api/products/:id/images/:imageId`
- `DELETE /api/images/:id`

### Pricing

- `GET /api/pricing/rulesets?storeId=...`
- `POST /api/pricing/rulesets`
- `PUT /api/pricing/rulesets/:id`
- `POST /api/pricing/rulesets/:id/rules`
- `PUT /api/pricing/rules/:id`
- `DELETE /api/pricing/rules/:id`
- `POST /api/pricing/evaluate`

`/evaluate` returns:

- `blanksSubtotal`
- `decorationSubtotal`
- `fees[]`
- `subtotal`
- `total`
- `notes[]`

### Quotes

- `GET /api/quotes?storeId=...`
- `POST /api/quotes`
- `GET /api/quotes/:id?storeId=...`
- `PUT /api/quotes/:id`
- `PUT /api/quotes/:id/status`
- `POST /api/quotes/:id/items`

`POST /api/quotes/:id/items` evaluates pricing and stores full `pricingSnapshot` on each line item.

## Dashboard Routes

- `/dashboard/products`
- `/dashboard/products/:id`
- `/dashboard/pricing`
- `/dashboard/quotes`

## Smoke Validation

### 1) Reset + seed

- `cd backend && npm run db:reset`

### 2) Start backend

- `cd backend && npm run dev`

### 3) Run smoke check

- `cd backend && npm run smoke:phase2a`

The smoke script verifies:

- seeded products are returned by `GET /api/products`
- pricing evaluator returns a breakdown
- quote draft creation works
- adding quote item stores `pricingSnapshot`
