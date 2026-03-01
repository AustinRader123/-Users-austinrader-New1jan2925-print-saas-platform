# Phase 5: Subscriptions + Domains + RBAC Polish

## Included
- Subscription and billing models with provider abstraction:
  - `Plan`, `TenantSubscription`, `BillingEvent`, `Invoice`
  - Mock-first billing flow with optional Stripe provider mode
- Plan-gated feature enforcement:
  - Centralized `FeatureGateService` (`can`, `limit`, `assert`, snapshot)
  - Route guards via `requireFeature(...)` and `requirePermission(...)`
- Custom domain support for stores:
  - `StoreDomain` model and `/api/domains` endpoints
  - Public storefront resolution by active domain host header
- Tenant-level feature overrides:
  - `FeatureOverride` model merged into effective plan features
- RBAC management APIs:
  - `/api/rbac/permissions`
  - `/api/rbac/roles` (list/create/update)
  - `/api/rbac/users`
  - `/api/rbac/assign`
- Billing APIs:
  - `/api/billing/snapshot`
  - `/api/billing/checkout`
  - `/api/billing/cancel`
  - `/api/billing/events`
- Frontend settings pages:
  - `/app/settings/billing`
  - `/app/settings/stores`
  - `/app/settings/users`
- Smoke validation:
  - `npm run smoke:phase5`

## New env knobs
- `BILLING_PROVIDER=mock|stripe` (default `mock`)
- `STRIPE_SECRET_KEY` (required when `BILLING_PROVIDER=stripe`)
- `ALLOW_MANUAL_DOMAIN_ACTIVATION=true|false` (default `true` for dev/smoke)

## Regression expectations
- Existing smokes continue to pass:
  - `smoke:phase2c`
  - `smoke:phase3_1`
  - `smoke:phase4`
- Phase 5 smoke covers:
  - Billing plan change + feature gate behavior
  - Domain create/verify + host-based public route resolution
  - RBAC role create + assignment
