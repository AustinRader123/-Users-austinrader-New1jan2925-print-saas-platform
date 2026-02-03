#!/usr/bin/env bash
set -euo pipefail

# Download artifacts for a specific or latest run and open Playwright report.
# Usage:
#  REPO="owner/repo" RUN_ID="latest" bash scripts/finalize_run_and_open_report.sh

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 127; }; }
need gh; need jq;

REPO="${REPO:-}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
RUN_ID="${RUN_ID:-latest}"
OUT_ROOT="${OUT_ROOT:-artifacts_download}"

if [ -z "$REPO" ]; then echo "REPO is required" >&2; exit 2; fi

pick_latest_run() { gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId'; }

if [ "$RUN_ID" = "latest" ]; then RUN_ID="$(pick_latest_run || true)"; fi
if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then echo "No run found" >&2; exit 3; fi
echo "Finalizing RUN_ID=$RUN_ID"

OUT="$OUT_ROOT/$RUN_ID"
mkdir -p "$OUT"
gh run download "$RUN_ID" --repo "$REPO" --dir "$OUT" || true

REPORT=$(find "$OUT" -type f -name index.html | grep -E 'playwright-report|playwright' | head -n 1 || true)
if [ -n "$REPORT" ]; then
  echo "Playwright report: $REPORT"
  command -v open >/dev/null 2>&1 && open "$REPORT" || true
else
  echo "No report found. Artifacts:"; gh run view "$RUN_ID" --repo "$REPO" --json artifacts -q '.artifacts[]?.name' || true
fi

echo "==> Files (first 200):"
find "$OUT" -maxdepth 5 -type f | head -n 200 | sed 's#^#  - #'
#!/usr/bin/env bash
# Next step: when the run finishes, print a clean summary,
# download artifacts (if any), and auto-open the Playwright HTML report (if present).
#
# Usage:
#   REPO="AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform" \
#   RUN_ID=2160652566 \
#   bash scripts/finalize_run_and_open_report.sh
#
# If RUN_ID is omitted, it auto-picks the latest run on the branch for nightly-e2e.yml.

set -euo pipefail

REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
RUN_ID="${RUN_ID:-}"
POLL_INTERVAL="${POLL_INTERVAL:-10}"

# Ensure gh and jq are available
for cmd in gh jq; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing required command: $cmd"; exit 1; }
done

if [[ -z "${RUN_ID}" ]]; then
  RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 \
    --json databaseId -q '.[0].databaseId')"
fi

OUT_DIR="artifacts_download/${RUN_ID}"
mkdir -p "$OUT_DIR"

echo "==> Watching run $RUN_ID ($REPO)"
while :; do
  STATUS="$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status')"
  CONCLUSION="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q '.conclusion')"
  echo "status=$STATUS conclusion=${CONCLUSION:-null}"
  [[ "$STATUS" == "completed" ]] && break
  sleep "$POLL_INTERVAL"
done

# Summary
#!/usr/bin/env bash
set -euo pipefail

# Defaults (override via env vars)
REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
POLL_INTERVAL="${POLL_INTERVAL:-15}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }
need gh
need jq

pick_latest_run_id() {
  # Picks the latest run for WORKFLOW on BRANCH
  gh run list \
    --repo "$REPO" \
    --workflow "$WORKFLOW" \
    --branch "$BRANCH" \
    --limit 1 \
    --json databaseId \
    -q '.[0].databaseId'
}

wait_for_completion() {
  local run_id="$1"
  while :; do
    local status
    status="$(gh run view "$run_id" --repo "$REPO" --json status -q .status)"
    echo "Status: $status"
    [[ "$status" == "completed" ]] && break
    sleep "$POLL_INTERVAL"
  done
}

download_artifacts() {
  local run_id="$1"
  local out_dir="artifacts_download/$run_id"
  mkdir -p "$out_dir"

  echo "Downloading artifacts to: $out_dir"
  # If there are no artifacts, gh exits non-zero; don't fail the script for that.
  gh run download "$run_id" --repo "$REPO" --dir "$out_dir" || true

  echo
  echo "Artifacts (local):"
  (cd "$out_dir" && find . -maxdepth 4 -type f | sed 's|^\./||' | sort) || true
  echo
  echo "Top-level tree:"
  (cd "$out_dir" && find . -maxdepth 2 -type d | sed 's|^\./||' | sort) || true

  # Try to locate Playwright report index.html
  local report
  report="$(find "$out_dir" -type f -name "index.html" | head -n 1 || true)"
  if [[ -n "${report:-}" ]]; then
    echo
    echo "✅ Found Playwright report: $report"
    echo "Opening report..."
    if command -v open >/dev/null 2>&1; then
      open "$report" || true
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$report" || true
    else
      echo "No 'open' or 'xdg-open' available. Open manually:"
      echo "$report"
    fi
  else
    echo
    echo "ℹ️ No Playwright index.html found in downloaded artifacts."
    echo "If the run succeeded but you see no report, confirm the workflow uploads it."
  fi
}

main() {
  # If RUN_ID provided, use it; otherwise pick latest
  local run_id="${RUN_ID:-}"
  if [[ -z "$run_id" ]]; then
    run_id="$(pick_latest_run_id || true)"
    if [[ -z "${run_id:-}" ]]; then
      echo "Could not find a recent run for:"
      echo "  REPO=$REPO"
      echo "  WORKFLOW=$WORKFLOW"
      echo "  BRANCH=$BRANCH"
      exit 1
    fi
  fi

  echo "Repo:     $REPO"
  echo "Workflow: $WORKFLOW"
  echo "Branch:   $BRANCH"
  echo "Run ID:   $run_id"
  echo

  wait_for_completion "$run_id"

  local conclusion url
  conclusion="$(gh run view "$run_id" --repo "$REPO" --json conclusion -q .conclusion)"
  url="$(gh run view "$run_id" --repo "$REPO" --json url -q .url)"

  echo
  echo "Conclusion: $conclusion"
  echo "Run URL:    $url"
  echo

  download_artifacts "$run_id"

  echo
  if [[ "$conclusion" == "success" ]]; then
    echo "🎉 PASS — run completed successfully."
  elif [[ "$conclusion" == "cancelled" ]]; then
    echo "⚠️ CANCELLED — no artifacts may exist. If this repeats, rerun dispatch or check concurrency/runner availability."
  else
    echo "❌ FAIL ($conclusion) — inspect artifacts/logs above."
    echo "Tip: view logs quickly:"
    echo "  gh run view $run_id --repo \"$REPO\" --log | tail -200"
    exit 2
  fi
}

main "$@"
