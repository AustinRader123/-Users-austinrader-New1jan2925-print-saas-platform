# Phase 8 — Product Builder + Public Customizer

Phase 8 adds a DecoNetwork-class customization flow with admin product builder controls, a public customizer experience, personalization pricing, proof automation, and print package generation.

## Delivered scope

- Data model and migration for:
  - `ProductCustomizationProfile`
  - `PersonalizationSchema`
  - `ArtworkCategory`
  - `ArtworkAsset`
  - `Customization`
  - `PrintPackage`
- New file kinds:
  - `CUSTOMIZER_UPLOAD`
  - `CUSTOMIZER_PREVIEW`
  - `PRINT_PACKAGE_ZIP`
- Admin APIs (`/api/customizer`) under:
  - `catalog.manage`
  - `customizer.manage`
  - `customizer.enabled`
- Public APIs (`/api/public/customizer`) for:
  - profile/config fetch
  - upload
  - preview
  - customize-and-add to cart
- Server-side validation/sanitization:
  - image-only uploads (`png`, `jpeg`, `webp`)
  - text sanitization (no `<`/`>` payload)
  - transform clamping (position/size/rotation bounds)
  - no arbitrary SVG/script ingestion
- Pricing extension:
  - personalization fees are merged into pricing breakdown and totals in `PricingRuleService.evaluate`
- Checkout proof automation for customized items:
  - auto-create proof request
  - queue/send proof email link
- Production print package endpoint:
  - `POST /api/production/jobs/:jobId/print-package`
  - generates zip with `manifest.json` and artwork files
- Feature gating:
  - `customizer.enabled` in defaults, plans, billing fallback, and route/service checks
- Frontend routes/pages:
  - admin builder: `/dashboard/catalog/product-builder/:productId`
  - public customizer: `/store/products/:slugOrId/customize`

## Smoke test

- New script: `backend/scripts/smoke-phase8.sh`
- Added scripts:
  - `cd backend && npm run smoke:phase8`
  - `npm run smoke:phase8`

The smoke test performs deterministic end-to-end checks:
1. Product profile setup (areas, personalization, artwork)
2. Public customizer config, upload, preview, add-to-cart
3. Checkout with customized line item
4. Proof request auto-creation verification
5. Print package generation verification
