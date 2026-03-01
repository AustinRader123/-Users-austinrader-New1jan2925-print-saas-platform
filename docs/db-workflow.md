# Database Workflow (Non-Interactive)

All DB commands must be non-interactive and fail fast. Never use `prisma migrate dev` in automation.

## Commands

Run from `backend/`:

```bash
npm run db:reset
npm run db:migrate
npm run db:deploy
npm run db:seed
```

## When to use each command

### `db:reset` (local dev only, destructive)
- Use when you want a clean local database.
- Runs:
  1. `prisma migrate reset --force --skip-generate`
  2. `prisma generate`
  3. `npm run db:seed`
- This drops data and rebuilds schema from migrations.

### `db:migrate` (safe local apply)
- Use for routine local migration apply without prompts.
- Runs `prisma migrate deploy` via non-interactive wrapper.

### `db:deploy` (CI/prod)
- Use in CI and production releases.
- Runs `prisma migrate deploy` only (no reset, no prompts).

### `db:seed` (idempotent)
- Safe to rerun.
- Upserts seed entities and prints created/linked IDs.

## Anti-hang guardrails

All DB scripts route through `scripts/run-noninteractive.sh`, which:
- sets `CI=1` and non-interactive env flags,
- enforces a hard 90 second timeout,
- logs command output to `artifacts/logs/noninteractive-*.log`,
- prints the last 100 log lines on timeout/failure,
- exits non-zero immediately on any error.

## Troubleshooting migration drift

Symptoms:
- Prisma asks to reset schema,
- migration history diverges,
- command previously hung waiting for input.

Resolution:
1. **Local dev (fresh start):** run `npm run db:reset`.
2. **CI/prod:** do **not** reset. Fix migration history and run `npm run db:deploy`.
3. If DB is unreachable, check:
   - `DATABASE_URL` correctness,
   - network/VPN/firewall access,
   - DB server health,
   - latest `artifacts/logs/noninteractive-*.log` output.

## Policy

- Never run `prisma migrate dev` in CI, scripts, or unattended automation.
- Use `db:reset` only for explicit local destructive resets.
- Use `db:migrate` for local non-interactive apply.
- Use `db:deploy` for CI/prod migration apply.
