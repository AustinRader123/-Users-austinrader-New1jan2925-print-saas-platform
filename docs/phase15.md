# Phase 15 — Polish + Notifications + Analytics + Security

## Status
- Branch: `phase15-polish-notifications-analytics-security`
- State: implementation complete
- Scope gate: deterministic mocks for notifications/webhooks; no external network dependency in smoke

## Delivered
- Prisma additions:
  - `NotificationTemplate`
  - `NotificationOutbox`
  - `EventLog`
  - Webhook enhancements (`name`, `isActive`, `deliveredAt`)
  - Api key security fields (hash/prefix/scopes/revocation metadata)
- Backend services/providers:
  - `EventService` event log + fan-out
  - `NotificationService` template/outbox processing
  - Deterministic `WebhookService` queue/process/retry
  - Mock providers for notifications and outbound webhooks
- Backend routes:
  - `GET/PUT /api/notifications/templates`
  - `GET /api/notifications/outbox`
  - `POST /api/notifications/outbox/process`
  - `POST /api/notifications/outbox/:id/retry`
  - `GET /api/analytics/summary`
  - `GET /api/analytics/funnel`
  - `GET /api/analytics/top-products`
  - `GET /api/analytics/export.csv`
  - Webhook delivery process/retry endpoints
- Event emission wiring:
  - proof requested/approved
  - invoice sent
  - payment receipt
  - shipment created/delivered
- Security hardening:
  - route-specific rate limits for auth + webhook ingress
  - mock webhook secret validation enforced on ingress routes
- Frontend admin pages:
  - `DashboardNotificationsPage`
  - `DashboardWebhooksPage`
  - `AnalyticsPage`
  - route and navigation wiring
- Deterministic smoke:
  - `npm run smoke:phase15`
  - added to release matrix

## Acceptance
- `backend npm run smoke:phase15` PASS
- `frontend npm run build` PASS
- `backend npm run build` PASS
- `release:check` PASS (with `DOCTOR_ALLOW_LOCALHOST_DB=1` in local env)
