# Seed Policy

This policy defines how seed data is created and used across environments.

## Goals

- Deterministic local/dev setup.
- Safe defaults for staging.
- No accidental production mutation.

## Environment Rules

- Local/dev: full baseline seed allowed.
- Staging: constrained seed allowed for test tenants only.
- Production: no automatic seeding; migration-only schema changes.

## Seed Content Baseline

- One default tenant and store set.
- Minimal admin user for bootstrap.
- Canonical sample entities for key modules (products, orders, quotes).
- No synthetic PII beyond explicit test accounts.

## Idempotency Requirements

- Seeds must be re-runnable without duplicate records.
- Use stable keys/upserts instead of blind inserts.
- Handle partial prior runs safely.

## Safety Controls

- Require explicit env gate for non-local seed execution.
- Log summary counts for created/updated records.
- Fail fast on schema mismatch.
- Never write secrets into seed fixtures.

## Operational Guidance

- Run seeds after successful migration only.
- Keep seed versioning aligned with schema evolution.
- Validate seed outcomes with module smoke commands.
