# Phase 14 — Accounting/Tax + Real Providers (Payments, Shipping, Webhooks, Ledger)

## Summary
- Adds real provider adapter interfaces + first implementation(s) behind feature gates:
  - payments.enabled + payments.provider=stripe (default OFF)
  - shipping.enabled + shipping.provider=easypost|shippo (default OFF)
  - tax.enabled + tax.provider=internal (default ON for deterministic) or avalara (optional later)
- Introduces accounting-grade ledger (append-only) for payments/refunds and reconciles invoice balances.

## Feature Gates / Config
- payments.enabled (default OFF)
- payments.provider (stripe|mock)
- shipping.enabled (default OFF)
- shipping.provider (easypost|shippo|mock)
- tax.enabled (default ON in internal mode)
- tax.provider (internal|avalara optional later)

## Acceptance Criteria (must remain deterministic in MOCK mode)
- release:check PASS
- smoke:phase14 PASS (MOCK mode)
- Existing smokes remain PASS (phase2c, phase3_1, phase13, etc.)
- Provider sandbox mode works when env vars exist (optional CI job or manual)

## Checklist
- [ ] Provider interface layer added (PaymentsProvider, ShippingProvider, TaxProvider)
- [ ] Stripe adapter: payment intent create/confirm + webhook handler
- [ ] Shipping adapter: rates + label + tracking webhooks
- [ ] Accounting ledger tables + migrations
- [ ] Portal “Pay Now” visible only when enabled
- [ ] Deterministic smoke coverage added
- [ ] Docs updated (phase14.md)
