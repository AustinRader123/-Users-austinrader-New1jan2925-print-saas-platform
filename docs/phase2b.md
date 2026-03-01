# Phase 2B: Designer, Proofing, Quote→Order, Production Work Orders

## Scope
- Adds persisted design file assets and deterministic mockup render endpoints.
- Adds quote conversion endpoint that creates an order and production job.
- Adds proof-request workflow with admin request + public token approval/rejection.
- Adds production work-order PDF generation with QR code and stored file assets.
- Adds Phase 2B smoke script and npm command.

## Backend APIs
- Designs
  - `POST /api/designs/:designId/assets/upload` (auth) multipart upload + `FileAsset` record.
  - `GET /api/designs/:designId/assets` (auth) list stored assets.
  - `POST /api/designs/:designId/mockups/render` (auth) deterministic render request.
  - `GET /api/designs/mockups/:mockupId/status` (auth) render status.
- Quotes
  - `POST /api/quotes/:quoteId/convert` (auth, admin/store owner) quote → order conversion.
- Proofs
  - `POST /api/proofs/request` (auth, admin/store owner) create proof request.
  - `GET /api/proofs` (auth) list proof requests by store.
  - `POST /api/proofs/:approvalId/respond` (auth) admin approve/reject.
  - `GET /api/proofs/public/:token` (public) fetch proof request.
  - `POST /api/proofs/public/:token/approve` (public).
  - `POST /api/proofs/public/:token/reject` (public).
- Production
  - `POST /api/production/jobs/:jobId/work-order` (auth, admin/production manager) generate PDF + QR.

## Data Model Additions
- Added additive migration `20260228120000_phase2b_designer_proof_production`.
- New models:
  - `FileAsset`
  - `ProofApproval`
  - `ProofApprovalEvent`
- Updated models:
  - `Quote`/`Order` relation for quote conversion provenance.
  - `ProductionJob` work-order metadata fields.

## Frontend
- Added public proof portal page at `/proof/:token`.
- Extended dashboard quotes with:
  - quote conversion action,
  - proof request action.
- Replaced placeholder designs page with create/list flow.
- Extended design editor to upload/list assets and call deterministic render endpoint.
- Updated production queue statuses to backend enums and added work-order generation action.

## Validation
Run in order:
1. `cd backend && npm run db:reset`
2. `cd backend && npm run db:deploy`
3. `cd backend && npm run db:seed`
4. `cd backend && npm run build`
5. `cd frontend && npm run build`
6. Start backend (`cd backend && npm run dev`) and run `cd backend && npm run smoke:phase2b`
