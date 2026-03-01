# Phase 9 — Multi-Store / Franchise Network

Phase 9 adds a feature-gated network layer for multi-store and franchise operations while preserving single-store behavior.

## Scope Delivered

- Network topology models:
  - `Network`, `NetworkStore` (OWNER/HUB/SPOKE), `NetworkUserRole`
- Shared catalog publishing and apply flow:
  - `SharedCatalogItem`, `StoreCatalogBinding`
  - Publish product/pricing/artwork items with versioning
  - Apply to target stores with idempotent version checks
- Fulfillment routing:
  - `FulfillmentRoutingRule`, `RoutedOrder`
  - Spoke-origin orders are routed to eligible hub/owner targets
  - Routed status updates mirror to order fulfillment lifecycle
- Royalties:
  - `RoyaltyRule`, `RoyaltyLedgerEntry`
  - Royalty accrual on routed order completion
  - Aggregated report and CSV export
- Central admin UX:
  - `/app/network`
  - `/app/network/routing`
  - `/app/network/reports`
- Deterministic smoke:
  - `backend/scripts/smoke-phase9.sh`

## Data Model

New Prisma entities and enums were added for:

- Network ownership and membership
- Shared catalog publication history and per-store binding versions
- Cross-store routing and mirrored statuses
- Royalty computation policy + ledger

`Order` now includes:

- `fulfillmentStoreId`
- Relation to `RoutedOrder`
- Relation to `RoyaltyLedgerEntry`

All changes are additive and backwards compatible.

## Feature Gate + Permissions

New feature gate key:

- `network.enabled`

New permissions:

- `network.manage`
- `network.publish`
- `network.route`
- `network.reports.view`

Plan defaults:

- FREE, STARTER: `network.enabled = false`
- PRO, ENTERPRISE: `network.enabled = true`

## API Surface

Base: `/api/network`

### Network Management

- `GET /networks`
- `POST /networks`
- `GET /networks/:networkId/overview`
- `GET /networks/:networkId/stores`
- `POST /networks/:networkId/stores`
- `POST /networks/:networkId/stores/create`

### Shared Catalog

- `GET /networks/:networkId/shared-items`
- `POST /networks/:networkId/publish/product/:productId`
- `POST /networks/:networkId/publish/pricing-rule-set/:ruleSetId`
- `POST /networks/:networkId/publish/artwork-category/:categoryId`
- `POST /networks/:networkId/publish/artwork-asset/:assetId`
- `POST /networks/:networkId/apply`
- `GET /networks/:networkId/bindings`

### Routing

- `GET /networks/:networkId/routing-rules`
- `POST /networks/:networkId/routing-rules`
- `POST /route-order/:orderId`
- `GET /networks/:networkId/routed-orders`
- `POST /networks/:networkId/routed-orders/:routedOrderId/status`

### Royalties

- `GET /networks/:networkId/royalty-rules`
- `POST /networks/:networkId/royalty-rules`
- `GET /networks/:networkId/royalties/report`
- `GET /networks/:networkId/royalties/export.csv`

## Routing and Mirror Rules

- Public checkout now attempts network routing after order + production job creation.
- Manual route endpoint remains available for explicit rerouting.
- Routed status updates (`ACCEPTED`, `IN_PRODUCTION`, `SHIPPED`, `COMPLETED`) update order fulfillment/status.
- Production and order status updates also sync routed order status when applicable.

## Royalties

- Active rule selected per network (oldest enabled first).
- Supported bases:
  - `REVENUE`
  - `PROFIT`
  - `DECORATION_ONLY`
- Ledger row is upserted per routed order.
- CSV export includes order, source/target store, revenue/cost/royalty, currency, and status.

## Smoke Test

Run:

- `cd backend && npm run smoke:phase9`

What it verifies:

1. Network create + hub/spoke create
2. Product publish + apply to spoke/hub
3. Routing rule + royalty rule creation
4. Spoke checkout order creation
5. Route + status progression to completion
6. Royalty ledger/report row creation

## Compatibility Notes

- Existing single-store flows continue unchanged when `network.enabled` is false.
- All Phase 9 operations are tenant-aware and permission-checked.
- Existing phase smoke scripts remain valid.
