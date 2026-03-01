## Summary
- Implements Phase 15 polish and hardening:
  - Notification templates + outbox processing
  - Event analytics logging + summary/funnel/top-products/csv endpoints
  - Deterministic webhook delivery process/retry pipeline
  - Security hardening for auth/webhook ingress
  - Frontend dashboard pages for notifications/webhooks/analytics

## Backend
- Prisma migration: `20260305120000_phase15_notifications_analytics_security`
- New services: `EventService`, `NotificationService`
- Updated service: `WebhookService` (deterministic queue/process/retry)
- New routes: `notifications`, `analytics`
- Updated routes: `webhooks`, provider webhook ingress handlers
- Added `smoke:phase15` and release-matrix integration

## Frontend
- New pages:
  - `DashboardNotificationsPage`
  - `DashboardWebhooksPage`
  - `AnalyticsPage`
- Added API client methods for notifications, webhook queue controls, analytics
- Added route + nav wiring for new pages

## Security
- Route-specific rate limits:
  - `/api/auth`
  - `/api/payments/webhook/:provider`
  - `/api/shipping/webhook/:provider`
- Mock ingress signature checks now require `x-webhook-secret` when configured

## Validation
- [x] `backend npm run build`
- [x] `frontend npm run build`
- [x] `backend npm run smoke:phase15`
- [x] `DOCTOR_ALLOW_LOCALHOST_DB=1 npm run release:check`

## Notes
- Local `release:check` may fail at `smoke:prod_sim` without `DATABASE_URL` or `DOCTOR_ALLOW_LOCALHOST_DB=1`.
- `smoke:phase6` may be skipped locally when Docker is unavailable.
