# Phase 18 — Final Go-Live Checklist

## 0) Hygiene
- [ ] `git status` clean (ignore local submodule pointer noise: `repo` stays unstaged)
- [ ] `npm run release:check` PASS (and CI compose-smoke green)

## 1) Environment/Secrets
- [ ] Production `.env` (or platform secrets) set:
  - `DATABASE_URL`
  - `APP_BASE_URL` / `PUBLIC_BASE_URL`
  - Provider creds (payments/shipping/tax) OR confirm MOCK mode
  - Webhook signing secrets
- [ ] CORS/Trusted proxy config validated for production domain
- [ ] Rate limits enabled + sane defaults

## 2) Database
- [ ] Backup taken
- [ ] `npm run db:deploy` against production DB
- [ ] `npm run db:seed` (only if intended for prod) OR confirm prod seeding is disabled
- [ ] Health check endpoints OK: `/health`, `/ready`

## 3) Webhooks
- [ ] Payments webhook registered + signature verified
- [ ] Shipping webhook registered + signature verified
- [ ] Tax webhook registered + signature verified
- [ ] Idempotency confirmed (replay same event → no duplicates)

## 4) End-to-end Go/No-Go
- [ ] Public storefront: product → customize → cart → checkout → order created
- [ ] Proof link + approval flow works
- [ ] Production V2 board: reserve/print-guard/consume/release lifecycle works
- [ ] Purchasing: PO send/receive/close works
- [ ] Customer portal: invoice/billing/shipping pages load + permissions correct
- [ ] Exports download correctly (CSV/JSONL/ZIP) with stable ordering

## 5) Observability
- [ ] Request/trace IDs present end-to-end
- [ ] Error responses include requestId
- [ ] Logs/metrics dashboards available (or minimal log tail procedure documented)

## 6) Release
- [ ] Merge Phase 18 PR
- [ ] Tag `v0.18.0`
- [ ] Announce + runbook link
