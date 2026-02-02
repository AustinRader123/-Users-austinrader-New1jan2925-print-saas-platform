# PR Summary (Prepared)

## Changes
- Preview port 5173 stabilized and freed before start in `scripts/ci-e2e.sh`.
- Frontend build uses correct API base for preview: `VITE_API_URL=http://localhost:3000/api`.
- Pack download link persistence: Kanban button now derives readiness from `job.packUrl` so links appear after refresh.
- Playwright regression stabilized:
  - Use any existing pack link or generate one when needed.
  - Fixed unrelated-route check to `/api/vendors`.

## Evidence
- Nightly regression PASS (3 tests): see `artifacts/nightly-regression.log`.
- Playwright artifacts (videos/traces): `artifacts/playwright-report-nightly/`.
- Backend/Frontend logs for run: `artifacts/backend-nightly.log`, `artifacts/frontend-nightly.log`.
- CI smoke PASS: `artifacts/e2e-ci.log`.

## Notes
- Preview server stays on 5173; backend on 3000.
- Orchestrator frees ports, runs migrate/seed, and generates storage state.

This PR keeps changes minimal and focused on CI/local E2E stability.
