# Phase 13 — Customer Portal + Billing + Shipping

## Scope
- Customer-facing portal endpoint for order, invoice, and shipment status.
- Store-scoped admin APIs for order invoices, append-only payment ledger, and shipping labels/tracking.
- Adapter-based shipping implementation with MOCK default.

## Feature Gates (default OFF)
- `portal.enabled`
- `billing.enabled`
- `shipping.enabled`

All three are OFF in defaults and seed plans. Enable per tenant through `FeatureOverride`.

## Permissions
- `billing.view`
- `billing.manage`
- `shipping.view`
- `shipping.manage`
- `portal.view` (reserved for role matrices; public portal is token-based)

## New Data Model
- `Customer`
- `InvoiceLine`
- `InvoiceSequence`
- `PaymentLedgerEntry` (`PaymentLedgerEntryType` enum)
- `ShipmentEvent`

Extended models:
- `Order.customerId`
- `Invoice` totals/status/ledger relations
- `Shipment` label/tracking/provider/event relations
- `FileAssetKind.SHIPPING_LABEL_PDF`

## API Endpoints
### Admin Billing (`/api/order-billing`)
- `GET /invoices?storeId=...`
- `GET /invoices/:invoiceId?storeId=...`
- `GET /ledger?storeId=...&invoiceId=...`
- `POST /orders/:orderId/invoice`
- `POST /invoices/:invoiceId/payments`

### Admin Shipping (`/api/shipping`)
- `GET /shipments?storeId=...`
- `GET /shipments/:shipmentId?storeId=...`
- `POST /orders/:orderId/label`
- `POST /shipments/:shipmentId/events`
- `POST /shipments/:shipmentId/track`

### Public
- `GET /api/public/portal/:token`

## Frontend Pages
- `/dashboard/billing`
- `/dashboard/shipping`
- `/portal/:token`

## Smoke
- `cd backend && npm run smoke:phase13`

Smoke validates:
1. gate overrides enabled for test tenant,
2. invoice creation + payment ledger append,
3. mock shipping label generation,
4. public portal aggregate response.
