#!/usr/bin/env bash
set -euo pipefail

# Dispatch workflow with inputs, watch until completion, download artifacts, open report.
# Usage:
#  REPO="owner/repo" BRANCH="chore/nightly-regression-pass" SUITE="regression" SKIP_PACK_E2E="false" bash scripts/dispatch_and_watch.sh

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 127; }; }
need gh; need jq;

REPO="${REPO:-}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
SUITE="${SUITE:-regression}"
SKIP_PACK_E2E="${SKIP_PACK_E2E:-false}"
OUT_ROOT="${OUT_ROOT:-artifacts_download}"
POLL="${POLL:-15}"
WAIT_MIN="${WAIT_MIN:-60}"

if [ -z "$REPO" ]; then echo "REPO is required" >&2; exit 2; fi

echo "Dispatching $WORKFLOW on $BRANCH: suite=$SUITE skip_pack_e2e=$SKIP_PACK_E2E"
gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH" -f suite="$SUITE" -f skip_pack_e2e="$SKIP_PACK_E2E" || true

pick_latest_run() {
  gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId'
}

RUN_ID="$(pick_latest_run || true)"
if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then echo "No run found after dispatch" >&2; exit 3; fi
echo "==> Using RUN_ID=$RUN_ID"

deadline=$(( $(date +%s) + WAIT_MIN*60 ))
while true; do
  now=$(date +%s)
  if [ "$now" -ge "$deadline" ]; then echo "TIMEOUT after ${WAIT_MIN}m"; exit 2; fi
  r_status="$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status' 2>/dev/null || echo unknown)"
  r_conclusion="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q '.conclusion // ""' 2>/dev/null || echo "")"
  r_url="$(gh run view "$RUN_ID" --repo "$REPO" --json url -q '.url' 2>/dev/null || echo "")"
  echo "[$(date +%H:%M:%S)] status=$r_status conclusion=${r_conclusion:-} url=$r_url"
  if [ "$r_status" = "queued" ] || [ "$r_status" = "in_progress" ]; then
    sleep "$POLL"; continue
  fi
  if [ "$r_status" = "completed" ]; then break; fi
  sleep "$POLL"
done

OUT="$OUT_ROOT/$RUN_ID"
mkdir -p "$OUT"
echo "Downloading artifacts to $OUT ..."
gh run download "$RUN_ID" --repo "$REPO" --dir "$OUT" || true

REPORT=$(find "$OUT" -type f -name index.html | grep -E 'playwright-report|playwright' | head -n 1 || true)
if [ -n "$REPORT" ]; then
  echo "Playwright report: $REPORT"
  command -v open >/dev/null 2>&1 && open "$REPORT" || true
else
  echo "No Playwright report found; listing artifact names:"
  gh run view "$RUN_ID" --repo "$REPO" --json artifacts -q '.artifacts[]?.name' || true
fi

echo "==> Files (first 200):"
find "$OUT" -maxdepth 5 -type f | head -n 200 | sed 's#^#  - #' || true
#!/usr/bin/env bash
set -euo pipefail

# ====== CONFIG ======
OWNER="AustinRader123"
REPO="-Users-austinrader-New1jan2925-print-saas-platform"
WORKFLOW_FILE="nightly-e2e.yml"
BRANCH="chore/nightly-regression-pass"

# Set to "false" to RUN pack tests, "true" to skip pack tests
SKIP_PACK_E2E="false"

# Polling controls
POLL_SECONDS=15
FIND_RUN_TIMEOUT_SECONDS=180   # how long to wait for the newly-dispatched run to appear
OUT_DIR="artifacts_download"
# ====================

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1"; exit 1; }; }
require gh
require jq

mkdir -p "$OUT_DIR"

REPO_SLUG="$OWNER/$REPO"
echo "Repo: $REPO_SLUG"
echo "Workflow: $WORKFLOW_FILE"
echo "Branch: $BRANCH"
echo "Inputs: skip_pack_e2e=$SKIP_PACK_E2E"
echo

# --- Dispatch a fresh run ---
echo "Dispatching workflow..."
gh workflow run "$WORKFLOW_FILE" \
  --repo "$REPO_SLUG" \
  --ref "$BRANCH" \
  -f "skip_pack_e2e=$SKIP_PACK_E2E"

echo "Dispatched. Now locating the new run id..."
echo

# --- Find the newest run for this workflow+branch ---
START_TS="$(date +%s)"
RUN_ID=""

while :; do
  # Get the most recent runs for this workflow, and pick the first matching branch
  RUN_ID="$(
    gh run list --repo "$REPO_SLUG" --workflow "$WORKFLOW_FILE" --json databaseId,headBranch,createdAt,status \
    | jq -r --arg BR "$BRANCH" '
        map(select(.headBranch == $BR))
        | sort_by(.createdAt) | reverse
        | .[0].databaseId // empty
      '
  )"

  if [[ -n "$RUN_ID" ]]; then
    echo "Found run id: $RUN_ID"
    break
  fi

  NOW_TS="$(date +%s)"
  ELAPSED=$((NOW_TS - START_TS))
  if (( ELAPSED > FIND_RUN_TIMEOUT_SECONDS )); then
    echo "ERROR: Timed out waiting for the new run to appear."
    echo "Try manually checking: https://github.com/$OWNER/$REPO/actions/workflows/$WORKFLOW_FILE"
    exit 1
  fi

  echo "Still waiting for run to appear... (${ELAPSED}s)"
  sleep 5
done

echo
echo "Run URL: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"
echo

# --- Watch until run completes ---
echo "Watching run until completion..."
while :; do
  STATUS="$(gh run view "$RUN_ID" -R "$REPO_SLUG" --json status -q '.status')"
  CONCLUSION="$(gh run view "$RUN_ID" -R "$REPO_SLUG" --json conclusion -q '.conclusion' 2>/dev/null || true)"
  TS="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$TS] status=$STATUS conclusion=${CONCLUSION:-null}"

  if [[ "$STATUS" == "completed" ]]; then
    break
  fi
  sleep "$POLL_SECONDS"
done

echo
echo "== Final summary =="
gh run view "$RUN_ID" -R "$REPO_SLUG" || true
echo

# --- List artifacts via API ---
echo "== Artifacts =="
ARTIFACTS_JSON="$(gh api -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/actions/runs/$RUN_ID/artifacts")"

TOTAL="$(echo "$ARTIFACTS_JSON" | jq -r '.total_count')"
echo "Artifact count: $TOTAL"

if [[ "$TOTAL" == "0" ]]; then
  echo "No artifacts to download."
  exit 0
fi

echo "$ARTIFACTS_JSON" | jq -r '.artifacts[] | "• \(.name) (id=\(.id), size=\(.size_in_bytes))"'
echo
echo "Downloading artifacts to: $OUT_DIR"
gh run download "$RUN_ID" -R "$REPO_SLUG" -D "$OUT_DIR"

echo
echo "== Download complete. Files =="
find "$OUT_DIR" -maxdepth 4 -type f | sed 's|^\./||'
echo
echo "DONE."