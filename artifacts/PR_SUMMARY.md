# PR Summary (Prepared)

## Changes
- Preview port 5173 stabilized and freed before start in `scripts/ci-e2e.sh`.
- Frontend build uses correct API base for preview: `VITE_API_URL=http://localhost:3000/api`.
- Pack download link persistence: Kanban button now derives readiness from `job.packUrl` so links appear after refresh.
- Playwright regression stabilized:
  - Use any existing pack link or generate one when needed.
  - Fixed unrelated-route check to `/api/vendors`.
 - Playwright baseURL config added at `frontend/playwright.config.ts` with env precedence `PLAYWRIGHT_BASE_URL > E2E_BASE_URL > http://127.0.0.1:5173`.
 - CI/nightly supports skipping pack tests via `SKIP_PACK_E2E=true` using `--grep-invert @pack`.
 - Nightly workflow added: `.github/workflows/nightly-e2e.yml` (2am UTC, manual dispatch, 21-day artifact retention).

## Evidence
- Nightly regression PASS (3 tests): see `artifacts/nightly-regression.log`.
- Playwright artifacts (videos/traces): `artifacts/playwright-report-nightly/`.
- Backend/Frontend logs for run: `artifacts/backend-nightly.log`, `artifacts/frontend-nightly.log`.
- CI smoke PASS: `artifacts/e2e-ci.log`.
 - Local smoke PASS with baseURL: `artifacts/e2e-ci-prepush.log`.

## Notes
- Preview server stays on 5173; backend on 3000.
- Orchestrator frees ports, runs migrate/seed, and generates storage state.
 - To skip pack tests in CI or local, set `SKIP_PACK_E2E=true`.
 - Playwright navigation can now use relative paths thanks to baseURL.

This PR keeps changes minimal and focused on CI/local E2E stability.
