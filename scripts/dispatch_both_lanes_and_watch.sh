#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
WF="${WF:-nightly-e2e.yml}"
POLL="${POLL:-15}"
OUT_ROOT="${OUT_ROOT:-artifacts_download}"
AUTO_OPEN_REPORT="${AUTO_OPEN_REPORT:-true}"  # set to false to disable

open_file() {
  local f="$1"
  [[ "${AUTO_OPEN_REPORT}" != "true" ]] && return 0
  [[ ! -f "$f" ]] && return 0

  echo "==> Attempting to open: $f"
  if command -v open >/dev/null 2>&1; then
    open "$f" || true                         # macOS
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$f" >/dev/null 2>&1 || true     # Linux
  elif command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c start "" "$(wslpath -w "$f" 2>/dev/null || echo "$f")" || true  # WSL-ish
  elif command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Start-Process '$f'" || true           # Git Bash-ish
  else
    echo "==> No opener found; open it manually."
  fi
}

dispatch() {
  local SKIP="$1"
  echo "==> Dispatch skip_pack_e2e=$SKIP"
  gh workflow run "$WF" --repo "$REPO" --ref "$BRANCH" -f "skip_pack_e2e=$SKIP"
}

latest_run_id() {
  gh run list --repo "$REPO" --workflow "$WF" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId'
}

wait_complete() {
  local RUN_ID="$1"
  echo "==> Watching RUN_ID=$RUN_ID"
  while true; do
    local status conclusion
    status="$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status')"
    conclusion="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q '.conclusion // ""')"
    echo "==> status=$status conclusion=$conclusion"
    [[ "$status" == "completed" ]] && break
    sleep "$POLL"
  done
}

download() {
  local RUN_ID="$1"
  local out="${OUT_ROOT}/${RUN_ID}"
  mkdir -p "$out"
  echo "==> Download artifacts -> $out"
  gh run download "$RUN_ID" --repo "$REPO" --dir "$out" || true
  echo "==> Artifact file list (top):"
  (cd "$out" && find . -maxdepth 5 -type f | sed -n '1,250p') || true
  echo "$out"
}

find_and_open_report() {
  local dir="$1"
  # Common locations in your setup:
  #   frontend/playwright-report/index.html
  # but download may wrap it inside artifact folder name
  local report
  report="$(find "$dir" -type f -path "*playwright-report*/index.html" -print -quit 2>/dev/null || true)"
  if [[ -n "$report" ]]; then
    echo "==> Playwright report: $report"
    open_file "$report"
  else
    echo "==> No Playwright report found under $dir"
  fi
}

run_lane() {
  local SKIP="$1"
  local LABEL="$2"

  dispatch "$SKIP"
  echo "==> Waiting for run to appear..."
  sleep 5

  local RUN_ID
  RUN_ID="$(latest_run_id)"
  echo "==> $LABEL RUN_ID=$RUN_ID"

  wait_complete "$RUN_ID"
  local out
  out="$(download "$RUN_ID")"
  find_and_open_report "$out"

  echo "==> $LABEL DONE (RUN_ID=$RUN_ID)"
}

# Run lanes serially (most reliable if concurrency cancels)
run_lane "true"  "SKIP_PACK"
run_lane "false" "FULL_PACK"

echo "==> ALL DONE"
