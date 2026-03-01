# Phase 2C — Customer Portal + Checkout + Team Stores + Inventory/Purchasing + Automations + Hardening

## Scope delivered

Phase 2C extends the platform with additive, migration-safe capabilities:

- Public storefront APIs and UI for browse → cart → checkout → public order status
- Team/fundraiser store model and public team checkout flow with close-date guardrails
- Inventory item + stock movement ledger and low-stock webhook publishing
- Purchase order lifecycle with line items and stock receiving
- Webhook endpoint management with deliveries/testing/retry support
- Audit log enrichment for key customer/admin actions

All schema and route changes are additive and preserve existing Phase 2A/2B behavior.

## API surfaces

### Public storefront

- `GET /api/public/storefront/:storeSlug`
- `GET /api/public/products?storeSlug=...`
- `GET /api/public/products/:id?storeSlug=...`
- `POST /api/public/cart`
- `GET /api/public/cart/:token`
- `POST /api/public/cart/:token/items`
- `PUT /api/public/cart/:token/items/:itemId`
- `DELETE /api/public/cart/:token/items/:itemId`
- `POST /api/public/checkout/:cartToken`
- `GET /api/public/order/:token`

## Public auth boundaries (lockdown)

### Public (no bearer auth required)

These endpoints are intentionally unauthenticated and token/slug scoped:

- `GET /api/public/storefront/:storeSlug`
- `GET /api/public/products?storeSlug=...`
- `GET /api/public/products/:id?storeSlug=...`
- `POST /api/public/cart` (requires body `storeSlug`)
- `GET /api/public/cart/:token` (requires cart token)
- `POST /api/public/cart/:token/items` (requires cart token)
- `PUT /api/public/cart/:token/items/:itemId` (requires cart token)
- `DELETE /api/public/cart/:token/items/:itemId` (requires cart token)
- `POST /api/public/checkout/:cartToken` (requires cart token)
- `GET /api/public/order/:token` (requires order token)

### Auth-protected (admin/staff)

All non-`/api/public/*` admin surfaces remain JWT-protected, including:

- `/api/admin/*`
- `/api/suppliers/*`
- `/api/pricing/*` write actions
- `/api/quotes/*`
- `/api/orders/*` (non-public order APIs)

### Store resolution + token rules

- Public cart creation resolves store from `storeSlug` only.
- After cart creation, cart token is the capability key for cart reads/mutations/checkout.
- Checkout validates cart token existence, status, and store-scoped data usage before order creation.
- Public order lookup uses `order.publicToken` only.
- Rate limits remain enabled on public routes (`publicLimiter`/`checkoutLimiter`).

### Team stores (admin)

- `GET /api/team-stores?storeId=...`
- `POST /api/team-stores`
- `PUT /api/team-stores/:id`
- `DELETE /api/team-stores/:id`
- `POST /api/team-stores/:id/roster/import`
- `GET /api/team-stores/:id/export/orders.csv`

### Inventory + purchasing

- `GET /api/inventory?storeId=...`
- `POST /api/inventory/adjust`
- `GET /api/purchase-orders?storeId=...`
- `GET /api/purchase-orders/:id?storeId=...`
- `POST /api/purchase-orders`
- `POST /api/purchase-orders/:id/lines`
- `PUT /api/purchase-orders/:id/status`
- `POST /api/purchase-orders/:id/receive`

### Webhooks

- `GET /api/webhooks/endpoints?storeId=...`
- `POST /api/webhooks/endpoints`
- `PUT /api/webhooks/endpoints/:id`
- `DELETE /api/webhooks/endpoints/:id`
- `POST /api/webhooks/endpoints/:id/test`
- `GET /api/webhooks/deliveries?storeId=...`

## Frontend routes

### Public

- `/store`
- `/store/products`
- `/store/products/:id`
- `/store/cart`
- `/store/checkout`
- `/store/order/:token`

### Team public

- `/team/:slug`
- `/team/:slug/products/:id`
- `/team/:slug/cart`
- `/team/:slug/checkout`

### Admin

- `/app/admin/team-stores` (also `/admin/team-stores`)
- `/app/admin/inventory` (also `/admin/inventory`)
- `/app/admin/purchase-orders` (also `/admin/purchase-orders`)
- `/app/admin/webhooks` (also `/admin/webhooks`)

## Smoke test (deterministic)

Script: `backend/scripts/smoke-phase2c.sh`

NPM command: `cd backend && npm run smoke:phase2c`

Validation chain:

1. Resolve seeded tenant/store/product/variant
2. Login admin
3. Create design
4. Public cart + add item + checkout
5. Public order token lookup
6. Proof request + public approve
7. Production job + work-order PDF generation
8. Purchase order create + receive stock

Expected end state: script prints `PASS` with IDs for order/proof/job/PO.

## Required command sequence

```bash
cd backend && npm run db:reset
cd backend && npm run db:seed
cd backend && npm run build
cd frontend && npm run build
cd backend && npm run smoke:phase2c
```

## Cleanup and Doctor

Default local ports and URLs:

- `BACKEND_PORT=3100`
- `FRONTEND_PORT=3000`
- `BASE_URL=http://localhost:${BACKEND_PORT}` (computed when unset)

Commands:

- `npm run stop` (workspace or backend):
	- Stops PID-tracked processes from `artifacts/pids/*.pid`
	- Frees configured backend/frontend ports
	- Verifies ports are closed
- `npm run clean` (workspace or backend):
	- Removes generated frontend artifacts (`dist/`, `build/`, `.next/`, `out/`, `coverage/`)
	- Removes `artifacts/logs/*.log`
	- Does not touch `node_modules`
- `npm run doctor` (workspace or backend):
	- Checks port conflicts
	- Validates key env (`DATABASE_URL`, `JWT_SECRET`, storage mode)
	- Runs DB reachability via `npm run db:migrate` and surfaces Prisma connectivity failures
	- Prints last log lines from `artifacts/logs` on failure

Smoke scripts (`phase2a/2b/2c`) are now self-contained:

1. Run doctor preflight
2. Run stop for clean start
3. Start backend on `BACKEND_PORT` with PID capture in `artifacts/pids/backend.pid`
4. Execute smoke flow against `BASE_URL`
5. Always stop backend on exit via `trap cleanup EXIT INT TERM`
