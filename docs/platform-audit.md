# Platform Audit — Phase 0

Summary of current codebase (scanned files under `backend/` and `frontend/`). This is the canonical starting point for the DecoNetwork evolution.

## Tech stack
- Backend: Node.js + TypeScript, Express.js routes under `backend/src/routes/`.
- Frontend: React (18) + TypeScript, Vite (dev/build), TailwindCSS, client routing in `frontend/src/App.tsx` (SPA/CSR).
- ORM / Data: Prisma (schema at `backend/prisma/schema.prisma`) targeting PostgreSQL (env `DATABASE_URL`).
- Queues: Bull (Redis) via `backend/src/services/QueueManager.ts`.
- Storage: `backend/src/services/StorageProvider.ts` with local fallback; S3 support planned.
- Testing: Playwright for frontend; Jest/ts-jest and integration tests (Prisma) present in `backend/src/__tests__`.

## Routing & dashboard
- Backend routes organized under `backend/src/routes/` (notably: `auth.ts`, `products.ts`, `designs.ts`, `orders.ts`, `production.ts`, `pricing.ts`, `vendors.ts`).
- Frontend dashboard pages under `frontend/src/pages/` and main router at `frontend/src/App.tsx` (includes Dashboard pages, Production board, Products, Quotes, Orders).
- API paths are prefixed with `/api` (backend routes mounted by `backend/src/app.ts`).

## Authentication & RBAC
- Auth: JWT-based tokens. Middleware at `backend/src/middleware/auth.ts` verifies JWT and injects `userId`, `userRole`, `storeId` onto requests.
- Password hashing: `bcryptjs` used by `AuthService`.
- Roles: `UserRole` enum in Prisma includes CUSTOMER, VENDOR, ADMIN, STORE_OWNER, PRODUCTION_MANAGER. `roleMiddleware()` enforces role checks on routes.
- RBAC status: Basic role checks exist (`roleMiddleware(['ADMIN', 'STORE_OWNER'])` etc.) but fine-grained permission model (Owner/Admin/Sales/Artist/Production/Customer) and tenant-scoped permissions need expansion.

## Data layer
- Prisma schema at `backend/prisma/schema.prisma` contains models for User, Store (tenant-like), Product, ProductVariant, Design, Mockup, PricingRule, Cart, Order, ProductionJob, etc. Many domain entities already present.
- Migrations: project uses `npx prisma migrate deploy` and `prisma generate` in scripts; migration files located under `backend/prisma/migrations`.
- Repositories/services: business logic in `backend/src/services/*` which use `new PrismaClient()` directly. Consider centralizing Prisma instance and tenant scoping.

## File uploads / storage
- Multer used for multipart uploads in specific routes (e.g., `vendors.ts`).
- `StorageProvider` provides a local upload implementation and a placeholder for S3.
- Uploads are persisted to `./uploads` when local; product images, design assets, mockups, and proof PDFs are referenced in DB models.

## Products / Inventory / Orders
- Strong product model exists with `Product`, `ProductVariant`, `ProductImage`, `DecorationArea`, etc.
- Orders, OrderItem, Cart and PricingSnapshot models exist; order lifecycle fields and production jobs are modeled in schema.
- Vendor/sync/import features and DN mapping tables exist (DnProductMap, DnVariantMap, DnInventoryMap) reflecting DecoNetwork adapters.

## Background jobs & eventing
- QueueManager uses Bull and is wired for import jobs, DN syncs, mockup processing (modules under `backend/src/modules/dn` and `backend/src/queue/`).
- Event names and processors are partially implemented (`dn:bootstrap`, import queues, mockup jobs). Outbox pattern not yet implemented.

## UI
- Dashboard SPA exists under `frontend/src/pages/` with pages for products, production board, designs, cart, orders, pricing preview.
- State management: `zustand` used for small global stores; API client at `repo/frontend/src/lib/api.ts` and `frontend/src/lib/api.ts`.

## Deployment
- `vercel.json` present; project has deployment scripts in `repo/scripts/` for Docker/Render/Vercel.
- Typical local run uses `backend` dev server (`npm run dev`, tsx) and Vite dev server in `frontend`. CI workflows and e2e exist in `.github/workflows`.

## Gaps & missing pieces (Phase 0 observations)
- Multi-tenancy: `Store` model functions as tenant; however, tenant scoping is not uniformly enforced (services use `storeId` in queries sometimes; central tenant middleware and query scoping should be formalized).
- RBAC: coarse role checks present; need role-permission mapping and UI enforcement.
- Storage: S3 integration is a TODO (local provider exists).
- Pricing engine: `PricingRule` and `PricingSnapshot` models present; `PricingEngine` service exists but needs tests and rule-editor UI.
- Designer: `Design` and `DesignService` exist; client-side designer pages exist but mockup generation workers are partial.
- Outbox / event reliability: no dedicated outbox pattern; queue jobs may be used directly.

## Next recommended actions (Phase 0 → Phase 1)
1. Add central Prisma client singleton and tenant scoping middleware. Audit all services to accept `storeId` / tenant context.
2. Create `docs/roadmap.md` (Phase 1–4) and seed demo tenant + admin user migration.
3. Implement StorageProvider S3 implementation and feature-flag with `S3_USE_LOCAL`.
4. Harden RBAC: add Permission sets, mapping to roles, and middleware to check permission strings.

---
Files inspected (representative):
- backend/prisma/schema.prisma
- backend/src/middleware/auth.ts
- backend/src/services/StorageProvider.ts
- backend/src/services/QueueManager.ts
- backend/src/routes/{auth,products,orders,production,pricing,vendors}.ts
- frontend/src/App.tsx and frontend/src/pages/*

If you'd like, I can now commit these docs and proceed to Phase 1 scaffolding (tenant middleware + seeds + RBAC), or iterate the audit to produce a more detailed mapping of every service that needs tenant scoping.
