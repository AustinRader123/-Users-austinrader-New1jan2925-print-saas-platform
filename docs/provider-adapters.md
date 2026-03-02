# Provider Adapters

This document describes provider adapter expectations and current integration posture.

## Adapter Contract

Each provider adapter should expose:

- `id`: stable provider identifier.
- `capabilities`: supported feature flags.
- `health()`: connectivity and auth validity check.
- `sync(input)`: idempotent ingestion/push operation.
- `normalize(payload)`: canonical shape mapping into SkuFlow domain models.

## Current Provider Surfaces

- Integrations module UI is present for provider status/config workflows.
- Webhooks module UI is present for endpoint/event visibility.
- Backend supports webhook and integration-adjacent API surfaces used by the UI.

## Required Behavior

- Deterministic outputs for identical input payloads.
- Explicit error typing (auth, rate limit, validation, transient).
- Retries only for transient errors with capped backoff.
- Request correlation via requestId in logs where available.

## Security Requirements

- Store provider secrets server-side only.
- Never expose raw credentials in frontend payloads.
- Validate webhook signatures before processing.
- Keep provider scopes minimal and auditable.

## Rollout Policy

- Start with read-only sync where feasible.
- Validate mapping in non-prod using representative fixtures.
- Enable write paths behind explicit flags.
- Add provider-specific smoke checks before enabling for all tenants.
