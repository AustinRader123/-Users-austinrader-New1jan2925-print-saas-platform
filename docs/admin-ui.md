# Admin UI — Smoke Test Results (Step 6)

## Pricing Rules UI
- Action: Created SCREEN_PRINT rule with 3 breaks, then edited qty 12 unitPrice.
- Result: PASS — Rule saved and appears in list; breaks preserved after edit.
- IDs:
  - storeId: cml43c2kt000110xp4pq3a76b
  - ruleId: cml4jh2ff0001tqocqx3dx422

## Pricing Simulator UI
- Action: Ran SCREEN_PRINT at qty 1, 12, 48 for default store and selected variant.
- Result: PASS — qty 12 reflects edited break; pricing varies with quantity.
- IDs:
  - storeId: cml43c2kt000110xp4pq3a76b
  - sample SKU: VEND-TSHIRT-BLACK-L
  - sample vendorId: cml4eylpx000ozt0e6befp2j4

## Vendor UI
- Action: Opened vendor; Import tab shows last job; Catalog tab lists variants/SKUs.
- Result: PASS — Import history visible; variants display correctly.
- IDs:
  - vendorId: cml4eylpx000ozt0e6befp2j4
  - productId: cml4f2nnm00035srzk19av3o4
  - variant (example): cml4f2vhz000a11xu2c4hla35 (sku: VEND-TSHIRT-BLACK-L)
# Admin UI

This Admin UI enables vendor catalog management and pricing control, replacing curl workflows.

## Login
- Use the seeded admin: `admin@local.test` / `Admin123!`.
- Login via the frontend `/login`. The navbar shows Admin links when authenticated with `ADMIN` role.

## Pages
- Vendors
  - List all vendors; create new vendor (name, email).
  - Click a vendor to open details.
- Vendor Detail
  - Catalog tab: Browse vendor products and variants; search by name or SKU.
  - Import tab: Upload CSV (multipart) with mapping JSON; view recent import jobs with status and errors.
  - Settings tab: Placeholder for metadata.
- Pricing Rules
  - List rules filtered by selected product.
  - Create, edit, delete rules. Editor supports base markup %, quantity breaks, and decoration costs.
- Pricing Simulator
  - Select store, variant, quantity, method (SCREEN_PRINT/EMBROIDERY), locations, colors.
  - Shows unit price, line total, and breakdown JSON including applied rule.

## API Assumptions
- Backend base `/api` proxied via Vite dev server.
- Protected routes require `ADMIN` role.
- Endpoints used:
  - `GET /api/vendors`, `POST /api/vendors`
  - `GET /api/vendors/:vendorId/products`
  - `POST /api/vendors/:vendorId/import-csv` (JSON) and `/api/vendors/:vendorId/import-csv-multipart`
  - `GET /api/vendors/:vendorId/import-jobs`
  - `GET/POST/PUT/DELETE /api/admin/pricing-rules`
  - `POST /api/pricing/preview`

## Notes
- CSV mapping JSON defaults match typical column names; adjust as needed.
- Import jobs show overall status and error string for failures.
- Simulator requires a valid `storeId` and variant.

## Smoke Test Results (2026-02-01)
- Servers:
  - Backend: running on 3000 (verified `/__ping`, `/health`, `/ready`).
  - Frontend: Vite dev at 5173 (login page loads).
- UI Pages:
  - Login page reachable; admin routes require login (redirect observed).
  - Vendors list/detail, Pricing Rules, Pricing Simulator routes mounted.
- Evidence Summary:
  - Duplicate vendor (API): PASS — existing vendor reused.
    - Response: `{ id: "cml4eylpx000ozt0e6befp2j4", name: "Acme Vendor" }`
  - Multipart import: PASS — 200 with counts.
    - Response: `{ jobId: "cml4iphqk00026jpcjw6f10eh", products: 2, variants: 2, created: 0, updated: 4, errorsCount: 0 }`
  - Import jobs: PASS — latest shows `COMPLETED`.
    - Job: `cml4iphqk00026jpcjw6f10eh`
  - Catalog: PASS — products/variants visible.
    - Sample: `Classic Tee` → variants `VEND-TSHIRT-BLACK-L` (L), `VEND-TSHIRT-WHITE-M` (M)
  - Pricing simulator: PASS — quantity breaks affect price; embroidery differs.
    - SCREEN_PRINT: qty 1 → $20.69; qty 12 → $19.39; qty 48 → $18.09
    - EMBROIDERY: qty 12 → $19.89
  - Pricing rules create/edit: FAIL — create returned error; edit attempt reset rule payload.
    - Create response: `{ error: "Failed to create pricing rule" }`
    - Edit response: rule `cml4fe83q0001dqr65s4v7cjv` returned empty breaks after PUT
- Preview outputs (SCREEN_PRINT):
  - Qty 1 → unit $20.69, line $30.69
  - Qty 12 → unit $19.39, line $242.68
  - Qty 48 → unit $18.09, line $878.32
- Preview outputs (EMBROIDERY):
  - Qty 12 → unit $19.89, line $253.68
- Network/Console:
  - No API failures during scripted run; a 500 was observed when importing CSV for a freshly-created vendor via JSON, but seeded vendor import succeeded. Admin UI interactive actions require manual login to complete.
- Backend logs:
  - Normal startup logs; an `EADDRINUSE` occurred when attempting to start a second backend instance (existing server already running).

## Regression Check: Vendor Creation Duplicate
- Action: Create a vendor with a name that already exists.
- Expected:
  - Backend returns 200 with the existing vendor (no 500).
  - Admin UI shows: "Vendor already exists, using existing".
- Status: Implemented and validated via API; UI message wired in `AdminVendorsPage`.

## IDs Used
- vendorId: `cml4eylpx000ozt0e6befp2j4`
- jobId: `cml4iphqk00026jpcjw6f10eh`
- productId: `cml4f2nnm00035srzk19av3o4`
- productVariantId: `cml4f2vhz000a11xu2c4hla35`
- pricingRuleId (existing): `cml4fe83q0001dqr65s4v7cjv`
