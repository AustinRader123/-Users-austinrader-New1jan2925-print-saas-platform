# Roadmap (Phase 1 → Phase 4)

This roadmap maps the user's requested scope onto staged workstreams. Each phase contains concrete deliverables and acceptance criteria.

## Phase 1 — Foundational SAAS & Domain Model (deliver in 2–4 sprints)
Deliverables:
- Tenant model + tenant scoping middleware
  - `Store` exists in schema; add middleware to inject `storeId` from token/subdomain/header and enforce in services.
  - Centralize Prisma client (`backend/src/lib/prisma.ts`) and pass `prisma` to services.
- RBAC core
  - Implement Permission entities + mapping to roles.
  - `roleMiddleware` → `permissionMiddleware(permissionString)` and UI gating.
- Storage
  - Implement S3 provider in `StorageProvider` behind feature flag `S3_USE_LOCAL`.
  - Add signed-upload endpoints + thumbnail pipeline (defer heavy processing to workers).
- Queues & outbox
  - Ensure `QueueManager` configured and create `Outbox` table or transactional enqueue helper.
- Seeds & demo tenant
  - Schema migration + seed for `demo tenant` and `admin user` + sample products/pricing.

Acceptance criteria:
- All API requests include tenant context. Services cannot read/write cross-tenant data without explicit mapping. Demo tenant available via seed.
- Admin UI shows tenant selector for owner/admin users.

## Phase 2 — Deco-class Core Workflows (3–6 sprints)
Deliverables:
- Catalog + decoration setup
  - Product/Variant management UI and APIs; decoration areas UI.
- Designer & mockups (Phase 1 realistic)
  - Canvas editor saving `Design` JSON and assets; server-side mockup composite worker (2D overlays).
- Pricing engine
  - DB-backed rule editor, rule evaluation engine with tests, pricing preview endpoint.
- Quotes
  - Quote creation, send, secure approval link, convert to order, PDF generation.
- Orders + proofs
  - Order lifecycle, proof requests/approvals and customer portal pages.

Acceptance criteria:
- End-to-end flow from product→design→quote→approval→order triggers production job.
- Pricing breakdown shown in UI and serialized in DB snapshot.

## Phase 3 — Storefronts & Team Stores (2–4 sprints)
Deliverables:
- Tenant storefront builder (themes + pages) with domain mapping and publish workflow.
- Product catalog and PDP with designer integration
- Cart + checkout (guest + account) with order sink into Orders system.

Acceptance criteria:
- Tenant can publish a storefront, accept orders, and orders appear in tenant dashboard.

## Phase 4 — Automations, Reports, Integrations, Hardening (ongoing)
Deliverables:
- Automation builder, webhooks, reports, Stripe + accounting integrations, security hardening.

Acceptance criteria:
- Production-grade monitoring, audit logs, rate limits, multi-region deployment plan, comprehensive test coverage for pricing and conversion flows.

---
Next steps (short term):
1. Approve Phase 1 scope; I will scaffold tenant middleware, central Prisma client, and a seed migration for demo tenant + admin user.
2. Add permission entity and simple UI permission checks in the dashboard nav.
