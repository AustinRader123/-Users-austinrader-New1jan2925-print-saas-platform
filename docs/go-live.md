# SKUFlow Go-Live Checklist

## 1) DNS + Domain
- Confirm `skuflow.ai` and `www.skuflow.ai` point to the intended Vercel project.
- In Vercel Domain settings, verify the domain is attached to the production project (not a preview/staging project).
- Confirm SSL is active for both apex and `www`.

## 2) Vercel Project Settings
- If project root is repository root:
  - Build command: `npm --prefix frontend ci && npm --prefix frontend run build`
  - Output directory: `frontend/dist`
- If project root is `frontend`:
  - Build command: `npm ci && npm run build`
  - Output directory: `dist`
- Verify rewrites exist for:
  - `/api/:match*` -> backend origin
  - `/app` -> `/index.html`
  - `/app/:path*` -> `/index.html`

## 3) Env Var Checklist
- Frontend (injected at build):
  - `VERCEL_GIT_COMMIT_SHA`
  - `VERCEL_ENV`
- Backend required envs (example):
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGINS`
  - provider keys if using non-mock billing/shipping/tax
- Never commit secrets in repository files.

## 4) UI Deploy Proof Verification
- Verify JSON endpoint:
  - https://skuflow.ai/__ui_build.json
- Verify in-app fixed banner (bottom-left) shows:
  - `UI commit`
  - `UI buildTime`
  - `UI env`
- Banner values must match `__ui_build.json`.

## 5) Backend Version Verification
- Check backend version endpoint:
  - https://skuflow.ai/api/version
- Confirm version metadata changed after backend deploys.

## 6) Cache / Service Worker Clearing
- Hard refresh (`Cmd+Shift+R`) after deploy.
- Open DevTools -> Application -> Clear Storage -> Clear site data.
- Ensure no stale service worker is registered (SKUFlow currently does not register one).
- Confirm `index.html` and `__ui_build.json` respond with `no-cache` headers.

## 7) Rollback Steps
- In Vercel Deployments, open previous successful production deployment and promote/rollback.
- Re-check:
  - `/__ui_build.json`
  - `/app`
  - key route pages (`/app/orders`, `/app/products`, `/app/production`)
- Optional: tag known-good git commit used for rollback reference.

## 8) Repeatable Local Verification
- Frontend build + preview:
  - `cd frontend && npm run build`
  - `cd frontend && npm run preview`
- Smoke test:
  - `cd frontend && PLAYWRIGHT_BASE_URL=https://skuflow.ai npm run smoke:ui`
