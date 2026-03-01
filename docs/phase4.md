# Phase 4: Pricing Engine V2 + Reports

## Included
- Deterministic `PricingEngineV2` decoration costing for:
  - `SCREEN_PRINT`, `EMBROIDERY`, `DTF`, `DTG`, `LASER_ENGRAVING`, `VINYL`, `SUBLIMATION`
- Shipping and tax config models:
  - `ShippingRate`
  - `TaxRate`
- Tax exemption flags on user:
  - `User.taxExempt`, `User.taxExemptId`
- Quote and order line item costing inputs:
  - `decorationInput`, `printSizeTier`, `colorCount`, `stitchCount`, `rush`, `weightOz`
- New APIs:
  - `POST /api/quotes/:quoteId/reprice`
  - `POST /api/orders/:orderId/reprice`
  - `GET/PUT /api/pricing/shipping-rates`
  - `GET/PUT /api/pricing/tax-rates`
  - `GET /api/reports/summary`
  - `GET /api/reports/products`
  - `GET /api/reports/export/orders.csv`
  - `GET /api/reports/export/quotes.csv`
- Frontend updates:
  - Quote page advanced inputs + repricing
  - Order detail margin/profit snapshots + repricing action
  - Reports page data + CSV export buttons
- Tests and smoke:
  - `backend/src/__tests__/pricing-engine-v2.test.ts`
  - `npm run smoke:phase4`
