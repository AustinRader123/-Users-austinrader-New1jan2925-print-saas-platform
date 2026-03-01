# Phase 14 — Accounting/Tax + Real Providers (Payments, Shipping, Webhooks, Ledger)

## Status
- Branch: `phase14-accounting-tax-real-providers`
- State: scaffold in progress
- Scope gate: default OFF for payment/shipping provider actions

## Feature Gates / Config
- `payments.enabled` (default OFF)
- `payments.provider` via env `PAYMENTS_PROVIDER` (`mock|stripe`, default `mock`)
- `shipping.enabled` (default OFF)
- `shipping.provider` via env `SHIPPING_PROVIDER` (`mock|shippo|easypost`, default `mock`)
- `tax.enabled` (default ON)
- `tax.provider` via env `TAX_PROVIDER` (`internal|avalara`, default `internal`)

## Scaffold Delivered In This PR
- Provider interface layer:
  - `PaymentsProvider`
  - `ShippingProvider`
  - `TaxProvider`
- Provider stubs:
  - Mock payments/shipping
  - Stripe payments scaffold
  - Internal deterministic tax provider
- Routes scaffold:
  - `POST /api/payments/intent`
  - `POST /api/payments/webhook/stripe`
  - `POST /api/shipping/rates`
  - `POST /api/shipping/label`
  - `POST /api/shipping/webhook/:provider`
  - `POST /api/tax/quote`
- Deterministic scaffold smoke:
  - `npm run smoke:phase14`

## Remaining Build-Out (Implementation Phase)
- Accounting-grade append-only payment intent + refund persistence model
- Invoice reconciliation write-paths and audit metadata
- Shipping label asset persistence in provider routes
- Webhook event ingestion persistence + replay safety (idempotency)
- Optional real-provider sandbox validation workflow job

## Acceptance Goal
- `release:check` PASS
- `smoke:phase14` PASS in mock/internal mode
- Existing smokes unchanged and PASS
