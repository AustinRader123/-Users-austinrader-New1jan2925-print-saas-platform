**Phase 0 — Repo Audit**

Summary
-------
- Frontend: React + Vite (TSX), React Router, Tailwind, Zustand stores. Built with `vite build`.
- Backend: Node.js + TypeScript + Express. Dev runner uses `tsx` (`npm run dev`).
- ORM/DB: Prisma + PostgreSQL (schema in `backend/prisma/schema.prisma`).
- Queues: Bull (Redis) + worker process `backend/src/worker.ts`.
- Auth: JWT-based custom middleware at `backend/src/middleware/auth.ts` with `roleMiddleware`.
- Storage: local filesystem code exists; S3 support via `aws-sdk` dependency.
- Logs: Winston present; orchestrator scripts write service logs to `artifacts/logs/`.

Key backend entrypoints & routes
-------------------------------
- App: `backend/src/app.ts` mounts routes and middlewares (health, /api/*).
- Auth routes: `backend/src/routes/auth.js` (mounted at `/api/auth`).
- Product/catalog routes: `backend/src/routes/products.js` (mounted at `/api/products`).
- Design & artwork routes: `backend/src/routes/designs.js` (mounted at `/api/designs`).
- Admin & debug routes: `backend/src/routes/admin*.js`, `backend/src/routes/debug.js`.
- Worker: `backend/src/worker.ts` (queue processors for DN bootstrap and sync jobs).

Existing domain models (representative from Prisma schema)
-------------------------------------------------------
- `User`, `Store`, `Product`, `ProductVariant`, `Order`, `Cart`, `Design`, `Mockup`, `DecoNetworkConnection`, `InventoryEvent`, many DN mapping models.

What is present vs missing (high-level)
--------------------------------------
Present (good scaffolding)
- Core data models for catalog, DN integration, inventory events, orders.
- JWT auth + optionalAuth + role middleware.
- Worker + queueing (Bull) patterns.
- Frontend admin/dashboard pages (Products, Orders, ProductionBoard, Designer page stubs).

Missing or incomplete (phase-1 priorities)
- Explicit `Tenant`/`TenantUser` models and enforced tenant scoping across services.
- Formal RBAC permission model (currently `roleMiddleware` accepts simple role lists; lacks permission strings and mapping).
- Full pricing rule engine and rule storage with explanation traces.
- Non-interactive, idempotent seed script that creates demo tenant + admin (there is `db:seed` but needs to be reviewed/ensured idempotent).
- Robust storage abstraction & S3 pipeline wiring for uploads/proofs/mockups.
- Production job models, Kanban APIs, and work-order generation (UI mostly stubbed).
- Public storefront and checkout pipeline integrated with quotes → orders.

Notes about orchestrator hang
----------------------------
- Existing orchestrators (`master-run.sh`, `master-debug-run.sh`) attempt an automatic bootstrap step (`scripts/run_register_and_bootstrap.sh`) which upserts stores and enqueues DN bootstrap jobs. That bootstrap can block on worker processing or DB readiness; we've modified the orchestrators to enforce timeouts. For local deterministic dev, avoid automated bootstrap — run migrations and seeds explicitly.

Recommended immediate next steps (Phase 0 → Phase 1 handoff)
---------------------------------------------------------
1. Add Tenant + TenantUser Prisma models and a tenant middleware (we added `backend/src/middleware/tenant.ts`).
2. Add a permission model (Permission, RolePermission) and a `permissionMiddleware(permission)` helper.
3. Implement a storage adapter interface and default local provider (S3 provider later).
4. Convert `db:seed` to idempotent seed that creates demo tenant + admin + sample catalog. Invoke seeds explicitly in dev.

See `docs/architecture.md` for proposed module boundaries and run commands that do not use orchestrators.
