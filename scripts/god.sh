#!/usr/bin/env bash
set -euo pipefail

# --- local report fallback (auto-added) ---
open_file() {
  local p="$1"
  if [[ "${AUTO_OPEN_REPORT:-true}" != "true" ]]; then return 0; fi
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$p" >/dev/null 2>&1 || true; return 0; fi
  if command -v open >/dev/null 2>&1; then open "$p" >/dev/null 2>&1 || true; return 0; fi
  if command -v powershell.exe >/dev/null 2>&1; then powershell.exe -NoProfile -Command "Start-Process \"$p\"" >/dev/null 2>&1 || true; return 0; fi
}

open_local_playwright_report_fallback() {
  # Prefer artifacts_download first, but fallback to local frontend/playwright-report
  local local_report="frontend/playwright-report/index.html"
  if [[ -f "$local_report" ]]; then
    echo "==> Fallback: opening local Playwright report: $local_report"
    open_file "$local_report" || true
  else
    # If there are multiple reports (historical), try the newest one under frontend/playwright-report
    local newest
    newest=$(ls -1t frontend/playwright-report/**/index.html 2>/dev/null | head -n 1 || true)
    if [[ -n "$newest" && -f "$newest" ]]; then
      echo "==> Fallback: opening newest local Playwright report: $newest"
      open_file "$newest" || true
    else
      echo "==> No local Playwright report found to open (frontend/playwright-report)."
    fi
  fi
}
# --- end local report fallback ---

# Repo configuration from environment or defaults
REPO=${REPO:-"AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform"}
BRANCH=${BRANCH:-"chore/nightly-regression-pass"}
WORKFLOW=${WORKFLOW:-"nightly-e2e.yml"}
AUTO_OPEN_REPORT=${AUTO_OPEN_REPORT:-"true"}

log() { printf "==> %s\n" "$*"; }

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing command: $1"; exit 1; }
}

require gh

# Ensure GH is authenticated
if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh not authenticated. Run: gh auth login"
  exit 1
fi

get_latest_run_id() {
  # Get latest run id for this workflow/branch
  gh run list \
    -R "$REPO" \
    --workflow "$WORKFLOW" \
    --branch "$BRANCH" \
    --limit 1 \
    --json databaseId,status,conclusion,workflowName,headBranch \
    -q '.[0].databaseId'
}

watch_and_download() {
  local run_id="$1"
  log "Watching run: $run_id"
  gh run watch "$run_id" -R "$REPO" || true
  log "Downloading artifacts for: $run_id"
  mkdir -p "artifacts_download/$run_id"
  gh run download "$run_id" -R "$REPO" -D "artifacts_download/$run_id" || true
  if [[ "$AUTO_OPEN_REPORT" == "true" ]]; then
    # Try opening Playwright report if present (macOS open)
    local report_dir
    report_dir=$(find "artifacts_download/$run_id" -type d -name 'playwright-report' | head -n 1 || true)
    if [[ -n "${report_dir}" && -f "${report_dir}/index.html" ]]; then
      log "Opening Playwright report: ${report_dir}/index.html"
      if command -v open >/dev/null 2>&1; then
        open "${report_dir}/index.html" || true
      fi
    fi
  fi
}

# Dispatch skip-pack lane
log "Dispatch skip_pack_e2e=true"
# Only pass the supported input skip_pack_e2e
gh workflow run "$WORKFLOW" -R "$REPO" -r "$BRANCH" -f skip_pack_e2e=true
sleep 3
SKIP_RUN_ID=$(get_latest_run_id)
if [[ -z "${SKIP_RUN_ID}" || "${SKIP_RUN_ID}" == "null" ]]; then
  echo "ERROR: Could not resolve run id for skip-pack dispatch"
  exit 1
fi
log "Skip-pack RUN_ID: ${SKIP_RUN_ID}"
watch_and_download "${SKIP_RUN_ID}"

# Dispatch full-pack lane
log "Dispatch skip_pack_e2e=false"
gh workflow run "$WORKFLOW" -R "$REPO" -r "$BRANCH" -f skip_pack_e2e=false
sleep 3
FULL_RUN_ID=$(get_latest_run_id)
if [[ -z "${FULL_RUN_ID}" || "${FULL_RUN_ID}" == "null" ]]; then
  echo "ERROR: Could not resolve run id for full-pack dispatch"
  exit 1
fi
log "Full-pack RUN_ID: ${FULL_RUN_ID}"
watch_and_download "${FULL_RUN_ID}"

log "Done. Artifacts downloaded to artifacts_download/<RUN_ID>"

open_local_playwright_report_fallback
