# Manual Test: Vendor CSV Import + Pricing Rules (Phase 3A)

## Overview
Validates CSV vendor import into normalized catalog, and pricing rules config with simulator.

## Prereqs
- Backend running at http://127.0.0.1:3000
- Frontend running at http://localhost:5173
- Logged in as ADMIN
- Known IDs:
  - storeId: cml43c2kt000110xp4pq3a76b (default)
  - vendorId: create via POST /api/vendors (name/email)

## Steps

1) Create Vendor (ADMIN)
- POST /api/vendors { name, email, connectorType: "csv" }
- Expect: 201, vendorId

2) Import CSV
- POST /api/vendors/:vendorId/import-csv
- Body: { storeId, csv, mapping }
- Expect: 200, { jobId, products, variants }
- Verify: GET /api/vendors/:vendorId/products lists products + variants

3) Normalized Catalog
- Verify Product/ProductVariant exist under storeId
- Expect: product slug based on name; variants linked and inventory set; images created

4) Pricing Rules
- Create rule: POST /api/admin/pricing-rules { productId, name, basePrice, colorSurcharge, perPlacementCost, quantityBreaklist }
- List rules: GET /api/admin/pricing-rules?productId=...
- Simulator: POST /api/pricing/preview { productVariantId, quantity }
- Expect: breakdown shows base, color surcharge, placement cost, quantity discounts

## Frontend UI
- Admin Vendor Import: /admin/vendors/import
  - Fields: vendorId, storeId, mapping JSON, CSV textarea
  - Run import: shows result; catalog renders vendor products + variants
- Admin Pricing Rules: /admin/pricing
  - Select product, create rule form, list rules
  - Simulator: select variant + qty, shows pricing JSON

## Evidence
- Endpoint statuses: 201 vendor create, 200 import, 200 rules CRUD, 200 pricing preview
- IDs: vendorId, jobId, productId, variantId, ruleId
- UI: pages load without console/network errors; data renders
