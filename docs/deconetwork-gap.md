# DecoNetwork Capability Gap Checklist

Status legend: [DONE] [PARTIAL] [NEXT]

## Designer / Artwork
- [PARTIAL] Artwork upload and attach to quote/order lines
  - Existing: `/api/designs/*`, `/api/customizer/*`, quote line attachment fields
  - Next: richer canvas controls and preflight warning surfacing in dedicated app route
- [NEXT] Full design proof iteration timeline per order

## Stores / Org
- [PARTIAL] Store selector and domain/store settings under app shell
  - Existing: `/app/stores`, `/api/domains`, `/api/navigation/menu`
  - Next: branding editor + store-level pricing/tax/shipping toggles on one page

## Quotes
- [DONE] Quote list/create/detail, add/update/remove line items, reprice/send/approve/convert
  - Endpoints: `/api/quotes`, `/api/quotes/:id/items`, `/api/quotes/:id/convert`, `/api/quotes/:id/reprice`, `/api/quotes/:id/send`

## Orders
- [PARTIAL] Order list/detail with status transitions and timeline continuity
  - Endpoints: `/api/orders`, `/api/orders/:id`, `/api/orders/:id/status`, `/api/orders/:id/timeline`
  - Next: request-proof and mark-approved workflow directly from app order detail

## Production
- [PARTIAL] Production board/jobs + scan actions and status transitions
  - Existing: `/app/production/*`, `/api/production/*`, `/api/production-v2/*`
  - Next: stronger ticket UX for reserve/consume directly in app board

## Purchasing
- [PARTIAL] PO list/detail, send/receive/close and inventory receive path
  - Existing: `/api/purchase-orders`, `/api/purchasing/pos/*`
  - Next: low-stock suggested PO generation shortcut in app purchasing page

## Inventory
- [PARTIAL] Inventory list, receive, and stock movement operations
  - Existing: `/api/inventory/*`, stock movement support
  - Next: explicit reserve/release/consume action row controls in app inventory table

## Shipping
- [PARTIAL] Shipment list, rate quote, label create, tracking sync, event logging
  - Existing: `/app/shipments`, `/api/shipping/*`, `/api/shipping/webhook/:provider`
  - Next: webhook event replay controls and provider-mode card in settings

## Billing / Payments / Tax
- [PARTIAL] Invoice and payment views, manual payment record, tax table controls
  - Existing: `/app/billing`, `/app/payments`, `/app/taxes`, `/api/order-billing/*`, `/api/pricing/tax-rates`, `/api/payments/webhook/:provider`
  - Next: unified provider mode toggles for real/mock + intent lifecycle details

## Reporting
- [PARTIAL] Summary/product reports + exports in app reports
  - Existing: `/api/reports/summary`, `/api/reports/products`, `/api/reports/export/*.csv`
  - Next: throughput and supplier spend charts with date presets

## Integrations
- [PARTIAL] Supplier connections, test, sync runs, webhook endpoints and deliveries
  - Existing: `/app/integrations`, `/app/webhooks`, `/api/suppliers/*`, `/api/webhooks/*`
  - Next: one-screen “Enable real provider” controls for shipping/payments/tax

## Roles / Permissions
- [PARTIAL] Users/Roles app screen with role assignment mutation
  - Existing: `/app/users-roles`, `/api/rbac/users`, `/api/rbac/roles`, `/api/rbac/assign`
  - Next: permission matrix editor per role
