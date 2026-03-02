# Ops Console Capability Gap Tracker

This tracker maps Deconetwork-class capabilities to SkuFlow implementation status without cloning proprietary UI/content.

## Status Legend
- Not Started
- Scaffold
- Partial
- Done

## Storefront Designer / Personalization
- **Status:** Partial
- **Acceptance criteria:** Product customizer available; proof workflow connects to order lifecycle.
- **Routes/files/tests:** `/store/products/:slugOrId/customize`, `frontend/src/pages/StoreProductCustomizerPage.tsx`, `backend/src/routes/public-customizer.ts`

## Catalog + Supplier Sync
- **Status:** Partial
- **Acceptance criteria:** Product + variants list/detail, supplier mapping available, CSV import accepted.
- **Routes/files/tests:** `/app/products`, `/app/products/import`, `frontend/src/pages/app/ProductsPage.tsx`, `backend/src/routes/products.ts`, `backend/src/routes/import_jobs.ts`

## Quote Builder
- **Status:** Partial
- **Acceptance criteria:** Create quote, view quote, update status, convert to order.
- **Routes/files/tests:** `/app/quotes`, `/app/quotes/new`, `/app/quotes/:id`, `frontend/src/pages/app/QuotesPage.tsx`, `backend/src/routes/quotes.ts`, `frontend/tests/ui-live-proof.spec.ts`

## Order Lifecycle
- **Status:** Partial
- **Acceptance criteria:** List/detail/create order, status transitions to production/shipped.
- **Routes/files/tests:** `/app/orders`, `/app/orders/new`, `/app/orders/:id`, `frontend/src/pages/app/OrdersPage.tsx`, `backend/src/routes/orders.ts`

## Production Workflow + Proofing
- **Status:** Partial
- **Acceptance criteria:** Board columns, scan-to-advance, batch move actions.
- **Routes/files/tests:** `/app/production/board`, `/app/production/jobs`, `frontend/src/pages/app/ProductionBoardPage.tsx`, `frontend/src/pages/app/ProductionJobsPage.tsx`, `backend/src/routes/production.ts`

## Purchasing + Receiving
- **Status:** Partial
- **Acceptance criteria:** PO list, send/receive/close actions from UI and API.
- **Routes/files/tests:** `/app/purchasing`, `/app/purchasing/:id`, `frontend/src/pages/app/PurchasingPage.tsx`, `backend/src/routes/purchasing.ts`

## Inventory Ledger
- **Status:** Partial
- **Acceptance criteria:** Inventory list with reserve/consume/release actions and alerts.
- **Routes/files/tests:** `/app/inventory`, `frontend/src/pages/app/InventoryPage.tsx`, `backend/src/routes/inventory.ts`

## Shipping + Labels + Tracking
- **Status:** Partial
- **Acceptance criteria:** Rate quote, create label, shipment event and track sync.
- **Routes/files/tests:** `/app/shipping`, `frontend/src/pages/app/ShippingPage.tsx`, `backend/src/routes/shipping.ts`, `backend/src/routes/shipping-webhooks.ts`

## Billing + Payments
- **Status:** Partial
- **Acceptance criteria:** Invoice list/detail and payment snapshot visibility.
- **Routes/files/tests:** `/app/billing`, `frontend/src/pages/app/BillingPage.tsx`, `backend/src/routes/billing.ts`, `backend/src/routes/order-billing.ts`

## Customer Portal
- **Status:** Partial
- **Acceptance criteria:** Public quote/invoice/portal endpoints render and secure by token.
- **Routes/files/tests:** `/quote/:token`, `/invoice/:token`, `/portal/:token`, `backend/src/routes/public.ts`

## Roles / Permissions
- **Status:** Partial
- **Acceptance criteria:** Role-protected nav and route-level checks present.
- **Routes/files/tests:** `frontend/src/nav/navConfig.ts`, `frontend/src/stores/authStore.ts`, `backend/src/middleware/auth.ts`, `backend/src/routes/rbac.ts`

## Notifications + Audit Logs
- **Status:** Partial
- **Acceptance criteria:** Notification endpoints and event emission integrated in core flows.
- **Routes/files/tests:** `backend/src/routes/notifications.ts`, `backend/src/services/EventService.ts`, `backend/src/routes/orders.ts`, `backend/src/routes/quotes.ts`
