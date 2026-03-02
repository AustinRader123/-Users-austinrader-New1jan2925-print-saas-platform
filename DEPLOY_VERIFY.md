# Deploy Verify

## Quick Proof URLs
- App: `https://skuflow.ai/`
- Build proof endpoint: `https://skuflow.ai/__build.json`

Expected `__build.json` shape:
```json
{
  "commit": "abcdef1",
  "buildTime": "2026-03-01T12:34:56.000Z"
}
```

## Verify Frontend Build Is New
1. Open `https://skuflow.ai/?v=1` in a normal tab.
2. Confirm fixed bottom banner text updates:
   - `Build: <shortCommit> | <buildTime>`
3. Open DevTools → **Console**.
4. Confirm startup log exists:
   - `SKUFlow build { commit: "...", buildTime: "..." }`

## Verify Which JS Bundle You Are Running
1. Open DevTools → **Network**.
2. Check **Disable cache**.
3. Reload page.
4. Filter for `index-` and click the main JS file (for Vite it is usually `index-<hash>.js`).
5. Search response content for `Build:` or `SKUFlow build`.
6. Confirm commit/buildTime match `https://skuflow.ai/__build.json`.

## Hard Refresh Correctly
1. Open DevTools first.
2. Keep **Disable cache** enabled.
3. Long-press refresh button in browser.
4. Click **Empty Cache and Hard Reload**.

## Service Worker + Site Data Reset (if stale UI persists)
1. DevTools → **Application**.
2. **Service Workers**:
   - Click **Unregister** for this origin.
3. **Storage**:
   - Click **Clear site data**.
4. Reload page and re-check banner + `__build.json`.

## Decision Tree (Most likely fix first)
- If `https://skuflow.ai/__build.json` does **not** change after push, but Vercel says deploy ready:
  - **Do Fix A**: Vercel Root Directory is wrong; set it to `/frontend`.
- If `__build.json` from `skuflow.ai` does not match the project you just deployed:
  - **Do Fix B**: custom domain is attached to the wrong Vercel project.
- If Vercel build logs show success but output looks old and `__build.json` missing:
  - **Do Fix C**: verify Vite build settings (`npm run build`, output `dist`).
- If `__build.json` shows new commit/buildTime but UI still looks old in your browser:
  - **Do Fix D**: clear browser/service-worker cache (steps above).

### Most likely in monorepo
For this repo shape, **Fix A (Root Directory `/frontend`)** is usually the top cause of “Ready deploy but old UI on domain”.
