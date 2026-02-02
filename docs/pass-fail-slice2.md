# Phase 2 Manual Test: Checkout → Order → Production Job (PASS/FAIL)

## Overview
This document tracks end-to-end validation across checkout, order creation with immutable snapshots, and automated production job creation. Evidence includes API responses and IDs.

## Environment
- Backend: http://127.0.0.1:3000
- Frontend: http://localhost:5173
- Auth: CUSTOMER token loaded

## Steps & Results

1) Health & Readiness
- Action: GET /__ping, /health, /ready
- Expected: 200 OK, fast responses; /health is DB-free; /ready true
- Result: PASS
- Evidence:
  - /__ping → 200 OK, body: "pong"
  - /health → {"status":"ok"}
  - /ready → {"ready":true}

2) Discover Catalog (Products/Variants)
- Action: GET /api/products, /api/variants, /api/catalog
- Expected: Product list available for a store; variants retrievable
- Result: BLOCKED
- Notes: /api/products requires `storeId`; /api/variants and /api/catalog return 404. Need valid `storeId` or documented public catalog endpoint.
- Evidence:
  - /api/products → 400 {"error":"Store ID required"}
  - /api/products?storeId=DEFAULT → 200 []

3) Add Cart Item(s)
- Action: POST /api/cart/items with variant identifier and quantity
- Expected: Item added; cart total updated
- Result: BLOCKED
- Notes: Endpoint returns 400 "Missing required fields" for attempted payloads. Need exact payload schema (e.g., `variantSku` or `variantId`, along with `storeId`?).
- Evidence:
  - POST /api/cart/items {} → 400 {"error":"Missing required fields"}
  - POST /api/cart/items {sku, quantity} → 400

4) Start Checkout
- Action: POST /api/checkout with items and shipping info
- Expected: Payment intent created (Mock provider)
- Result: BLOCKED (depends on Steps 2–3)

5) Confirm Payment (Mock)
- Action: POST /api/payments/mock/confirm with `paymentIntentId`
- Expected: Order created with immutable snapshot; Payment recorded; status updated
- Result: BLOCKED (depends on Step 4)

6) Verify Order
- Action: GET /api/orders, GET /api/orders/:id
- Expected: New order visible; snapshot fields populated
- Result: PENDING

7) Verify Production Job
- Action: Query production job list (admin or public endpoint), and confirm job linked to order
- Expected: Production job exists; status synced with order
- Result: PENDING

## Required Info to Unblock
- A valid `storeId` (seeded default store ID)
- The exact payload schema for `POST /api/cart/items` and `POST /api/checkout` (keys and shapes)
- If there is a public catalog endpoint for customers: path and query parameters

## Next Actions
- Once provided, I’ll:
  - Add a cart item using the valid schema
  - Execute checkout → mock confirm
  - Fetch order and production job data
  - Update this doc with PASS/FAIL outcomes and evidence

## Verification Update (PASS)
- Catalog discovered via seed/Prisma:
  - storeId: cml43c2kt000110xp4pq3a76b
  - productId: cml43c2kw000310xp2vptem80
  - variantId: cml43c2l7000u10xp7n938m5t (sku TSHIRT-BLACK-L)
- Schemas confirmed from code:
  - `POST /api/cart/items` requires `cartId`, `productId`, `variantId`, `quantity` (+ optional `designId`, `mockupUrl`) [backend/src/routes/cart.ts]
  - `POST /api/checkout` requires `storeId`, `cartId`, `shipping.{name,email,address}` [backend/src/routes/payments.ts]
- Cart add: 201 Created
  - cartId: cml4eaxgm0001zt0ecgmn11jw
  - cartItemId: cml4efhho0003zt0esn0pbyx0
  - pricingSnapshotId: cml4efhhv0005zt0eumxymxve
  - cart total: 33.98
- Checkout: 200 OK
  - intentId: pi_0f490263-3207-4238-bd0e-4bccc3b26b10
  - provider: mock; status: requires_confirmation
- Mock confirm: 200 OK
  - orderId: cml4efthd0007zt0e3xmex50z
  - paymentId: cml4efti8000nzt0evotcvxyn (PAID 33.98)
- Order verification:
  - /api/orders shows the new order (PENDING, PAID, total 33.98)
  - item: variantId cml43c2l7000u10xp7n938m5t, qty 2, unitPrice 16.99, total 33.98
  - pricingSnapshot frozen
- Production job:
  - jobId: cml4efti0000bzt0ezhlt5lpo (QUEUED), steps created: artwork_review, setup, production, quality_check, packing

## Storage/Assets & UI Notes
- Export assets/mockup: none created (no designId provided) — fields null
- UI: Customer orders endpoint reflects the new order; frontend Orders page should show it

## UI Evidence
- Orders List
  - URL: http://localhost:5173/orders
  - Expected: Heading “My Orders”, list item showing `ORD-1769990156545-3R52U`, status `PENDING`, payment `PAID`, total `$33.98`
  - Data Source: `/api/orders` returns the new order; UI maps and renders items
  - Errors: None observed via API; page loads in Simple Browser
- Order Detail
  - URL: (not implemented) — current UI has no dedicated order detail route; detail verified via Prisma/API
  - Expected Elements: Order header, item list, totals (future)
- Production Kanban (Admin)
  - URL: http://localhost:5173/admin/production
  - Access: Protected (`PRODUCTION_MANAGER` required); customer role will be redirected
  - Data Source: `/production/kanban` groups jobs by status; our job appears under `QUEUED`
  - Errors: None via API; UI loads in Simple Browser; admin view requires an admin session
- Production Job Detail
  - URL: (not implemented) — current UI shows kanban cards without click-through detail
  - Verified via Prisma/API: jobId `cml4efti0000bzt0ezhlt5lpo`, steps created
- Downloads (artwork/mockups)
  - Order item has `mockupUrl` null; no download links rendered — correct for this flow
