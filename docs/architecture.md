**Phase 0 — Proposed Architecture (high level)**

Goals
-----
- Modular, testable services with clear module boundaries.
- Multi-tenant isolation by `Store`/`Tenant` at data & API layer.
- Incremental delivery: enable features behind feature flags.

Module boundaries
-----------------
- api/ (backend Express app)
  - auth: JWT login, token issuance
  - tenants: tenant management (stores, domains)
  - catalog: products, variants, images
  - pricing: pricing rules, simulator
  - quotes: create/edit/convert
  - orders: order lifecycle, payments (record-only)
  - production: job creation, Kanban API
  - dn-integration: DN sync, maps, import jobs
  - admin: user/role management, integrations

- services/
  - storage: local + S3 adapters
  - pricing-engine: rule evaluator + explanation
  - queue-manager: Bull wrapper
  - mailer: SendGrid wrapper

- worker/
  - background processors for DN sync, mockup generation, pricing recalculation, exports

DB choices
----------
- Keep Prisma/Postgres.
- Add explicit `Tenant`/`TenantUser` models and ensure `WHERE storeId = ?` scoping in services.
- Add `Permission` and `RolePermission` models; keep `User.role` for coarse roles but move fine-grained checks to permission service.

Storage
-------
- Implement `StorageProvider` interface in `backend/src/services/storage/*` with two implementations:
  - `LocalStorageProvider` (writes to `artifacts/uploads/`)
  - `S3StorageProvider` (for production; controlled by `STORAGE_PROVIDER` env var)

Queueing & workers
------------------
- Keep Bull + Redis for queueing.
- Worker processes run `backend/src/worker.ts` and register processors from `backend/src/queues/*`.

API contract & health
---------------------
- Keep simple health endpoints: `/health` (app alive), `/ready` (DB connectivity).
- No automated bootstrap on start. Migrations and seeds must be run explicitly in dev.

Run path (dev, deterministic)
-----------------------------
1. Start infra:
   - docker compose up -d postgres redis
2. Install deps:
   - backend: `cd backend && npm ci`
   - frontend: `cd frontend && npm ci`
3. Migrate DB:
   - `cd backend && npm run db:migrate`
4. Seed (idempotent):
   - `cd backend && npm run db:seed`
5. Start services:
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev -- --host --port 5173`

Feature flags & rollout
-----------------------
- Use an env-driven feature toggle system (e.g. `FEATURE_PRICING_ENGINE=true`) and gate UI routes accordingly.

Next steps for Phase 1
----------------------
1. Add Prisma models for Tenant/TenantUser/Permissions and migration.
2. Add storage adapter and wire upload endpoints to use it.
3. Implement idempotent `db:seed` script creating demo tenant, admin user, and sample catalog.
4. Add `permissionMiddleware(permission)` and seed initial permission mappings.
