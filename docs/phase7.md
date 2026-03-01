# Phase 7 – Onboarding, Theme, Email, PDFs, Communications

This phase adds production-ready onboarding and customer communications flows.

## Backend APIs

- Onboarding
  - `GET /api/onboarding?storeId=...`
  - `PUT /api/onboarding`
  - `POST /api/onboarding/complete`
- Theme
  - `GET /api/theme?storeId=...`
  - `PUT /api/theme`
  - `POST /api/theme/publish`
  - `POST /api/theme/preview-token`
  - `GET /api/public/theme-preview?token=...`
- Communications
  - `GET /api/communications/email-config`
  - `PUT /api/communications/email-config`
  - `GET /api/communications/logs?storeId=...`
- Documents/Templates
  - `GET /api/documents/templates?storeId=...`
  - `PUT /api/documents/templates/:type`
- PDF + send actions
  - `GET /api/quotes/:id/pdf`
  - `POST /api/quotes/:id/send`
  - `GET /api/orders/:id/invoice.pdf`
  - `POST /api/orders/:id/send-invoice`
  - `GET /api/proofs/:id/pdf`
- Public communications links
  - `GET /api/public/quote/:token`
  - `GET /api/public/invoice/:token`

## Frontend routes

- Public:
  - `/quote/:token`
  - `/invoice/:token`
- Dashboard:
  - `/app/dashboard/onboarding`
  - `/app/dashboard/storefront/theme`
  - `/app/dashboard/communications`

## Smoke validation

Run:

- `npm run smoke:phase7`

The script performs:

1. DB reset/seed and backend startup
2. Onboarding update + complete
3. Theme draft + publish + preview token
4. Email provider config + logs fetch
5. Quote PDF generation + send + public quote link resolution
6. Public checkout order creation + invoice PDF + send + public invoice link resolution

## Notes

- Email provider is mock-first by default and logs all events.
- Public quote/invoice links are tokenized and stored as hashed values.
- Work order PDF generation now includes store branding metadata when available.
