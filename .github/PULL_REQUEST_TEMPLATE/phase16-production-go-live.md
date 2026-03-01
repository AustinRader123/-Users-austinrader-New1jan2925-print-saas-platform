## Summary
- Adds Phase 16 production go-live scaffold:
  - Production env templates (root/backend/frontend)
  - Runtime production guardrails (strict CORS, trust proxy, no localhost DB in prod)
  - Production webhook signature enforcement via HMAC
  - Real-or-mock provider selection scaffolding for notifications/webhooks/payments/shipping/tax
  - Production deployment artifacts (compose + nginx + runbook)
  - `smoke:phase16` and release matrix integration

## Validation
- [x] `cd backend && npm run build`
- [x] `cd frontend && npm run build`
- [x] `cd backend && ... npm run smoke:phase16`
- [ ] `npm run release:check` (phase3_1 transient no-data-row observed locally)
