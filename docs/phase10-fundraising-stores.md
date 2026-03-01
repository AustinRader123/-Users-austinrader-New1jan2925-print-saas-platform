# Phase 10 — Fundraising Campaigns + Team Stores

## Scope
- Campaign model with shipping mode (`DIRECT` / `CONSOLIDATED`) and split-shipping toggle.
- Campaign catalog overrides, team-store linking, member attribution, leaderboard.
- Consolidation run engine with idempotency key.
- Payout ledger with approve/pay lifecycle and CSV export.
- Public campaign APIs and campaign-aware cart/checkout attribution.

## Backend APIs
- Admin routes under `/api/fundraising` (feature-gated by `fundraising.enabled`):
  - `GET /campaigns`
  - `POST /campaigns`
  - `GET|PUT /campaigns/:campaignId`
  - `POST /campaigns/:campaignId/catalog-overrides`
  - `POST /campaigns/:campaignId/team-stores`
  - `POST /campaigns/:campaignId/members`
  - `GET /campaigns/:campaignId/summary`
  - `GET /campaigns/:campaignId/leaderboard`
  - `POST /campaigns/:campaignId/consolidate`
  - `GET /campaigns/:campaignId/consolidation-runs`
  - `GET /campaigns/:campaignId/ledger`
  - `GET /campaigns/:campaignId/ledger.csv`
  - `POST /ledger/:entryId/approve`
  - `POST /ledger/:entryId/pay`
- Public routes under `/api/public`:
  - `GET /campaigns/:slug`
  - `GET /campaigns/:campaignId/leaderboard`
  - `POST /cart` supports `fundraiser` attribution payload.

## Smoke test
- Run `npm run smoke:phase10` from `backend/`.
- Script validates:
  - feature enablement,
  - campaign + member creation,
  - attributed checkout,
  - contribution ledger entry,
  - consolidation idempotency,
  - payout approve/pay transitions.
