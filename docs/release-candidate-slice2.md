# Release Candidate - Slice 2

Scope
- Adds checkout & payment (mock provider), immutable order snapshots, production job automation, and admin production board.

Highlights
- POST /api/checkout → creates payment intent (mock), confirms in dev, and creates order + production job.
- Webhook: POST /api/payments/webhook supports mock event `payment_succeeded`.
- Admin Production APIs:
  - GET /api/admin/production-jobs
  - PATCH /api/admin/production-jobs/:id
  - GET /api/admin/production-jobs/:id/downloads
- OrderItem stores snapshots: pricingSnapshot, mockupPreviewUrl, exportAssets.

Risk/Impact
- Prisma schema change (OrderItem) requires migration.
- Existing POST /api/orders remains for compatibility but new flow uses /api/checkout.

Verification
- See docs/manual-test-slice2.md.
- Integration tests planned: cart → checkout → paid → order → production job.

Rollout
- Migrate DB.
- Deploy backend then frontend.
- Ensure PaymentConfig exists per store (mock path used by default).
