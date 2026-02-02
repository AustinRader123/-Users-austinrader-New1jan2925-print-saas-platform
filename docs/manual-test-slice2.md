# Manual Test - Slice 2: Cart → Checkout → Order → Production

Prereqs:
- Backend running on http://localhost:3000
- Frontend running on http://localhost:5173
- Logged in user (CUSTOMER) and seeded store `default`

Steps:
1) Cart → Checkout
- Add an item to cart via UI (design → mockup → cart).
- Go to /checkout and enter name, email, and shipping address.
- Click "Pay & Place Order".
- Expected: Success message with `Order ID`.

2) Order Snapshot
- Navigate to /orders.
- Find the newly created order; verify:
  - Payment: PAID
  - Each line item shows mockup thumbnail
  - Pricing matches cart total

3) Production Job Creation
- As admin/production manager, open /admin/production.
- Verify the job appears in the QUEUED/ARTWORK_REVIEW columns (depending on mapping).

4) Admin Downloads
- Call GET /api/admin/production-jobs/:id/downloads (use REST client/DevTools).
- Expected: JSON with download URLs for mockups and design exports.

5) Status Sync
- PATCH /api/admin/production-jobs/:id with `{ status: "IN_PRODUCTION" }`.
- Expected: Order status becomes `IN_PRODUCTION`.
- PATCH to `{ status: "COMPLETED" }` → Order status `READY_TO_SHIP`.

Notes:
- Mock payments: Internally confirms via /api/payments/mock/confirm.
- Correlation IDs are attached for tracing requests end-to-end.
