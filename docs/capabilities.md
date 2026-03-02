# Capabilities

This document maps currently shipped SkuFlow capabilities by module and execution surface (UI/API/smoke).

## Core Platform

- Auth: register, login, me, role-aware app shell access.
- Tenancy: tenant/store-scoped APIs across app modules.
- Build proof: `__ui_build.json` and in-app build banner.
- Release matrix: backend phase smokes + frontend module smokes.

## Sales

- Orders: list/detail/status updates and timeline events.
- Quotes: create/edit/convert and quote-to-order continuity.
- Customers: list/create/edit basic customer records.
- Portal: public portal route and token-based API surface.

## Catalog & Inventory

- Products: list/create/edit product records.
- Inventory: stock and inventory endpoint coverage.
- Purchasing: PO list/create/update flows.

## Fulfillment

- Production: production board + jobs endpoint access.
- Shipping: shipments route and API availability checks.

## Finance & Controls

- Billing: invoice API route checks and billing page wiring.
- Payments: payment configuration/status module page.
- Taxes: tax settings/rates module page.

## Admin & Integrations

- Stores: store listing/management page.
- Users/Roles: role listing and user management surfaces.
- Integrations: provider connection status/settings page.
- Webhooks: endpoint management/event delivery visibility page.

## Deterministic Smoke Coverage

Named smoke commands in frontend:

- `smoke:orders`
- `smoke:products`
- `smoke:quotes`
- `smoke:production`
- `smoke:inventory`
- `smoke:purchasing`
- `smoke:shipping`
- `smoke:billing`
- `smoke:portal`

Each checks route/API availability and enforces non-404 expectations.
