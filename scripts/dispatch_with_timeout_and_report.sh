#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
SKIP_PACK="${SKIP_PACK:-false}"
QUEUE_TIMEOUT="${QUEUE_TIMEOUT:-300}"
POLL="${POLL:-10}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
need gh
need jq

echo "🚀 Dispatching workflow..."
# Try to get run_id via --json; if unsupported, fallback to latest run id
RUN_ID=$(gh workflow run "$WORKFLOW" \
  --repo "$REPO" \
  --ref "$BRANCH" \
  -f skip_pack_e2e="$SKIP_PACK" \
  --json 2>/dev/null | jq -r '.run_id' || true)

if [[ -z "${RUN_ID}" || "${RUN_ID}" == "null" ]]; then
  # Fallback: pick latest run for this workflow+branch
  RUN_ID=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')
fi

echo "Run ID: $RUN_ID"
START_TIME=$(date +%s)

echo "⏳ Waiting for run to start..."
while :; do
  STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status -q .status)

  if [[ "$STATUS" != "queued" ]]; then
    break
  fi

  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))

  if (( ELAPSED > QUEUE_TIMEOUT )); then
    echo "⚠️  Stuck in queue. Cancelling & re-dispatching..."
    gh run cancel "$RUN_ID" --repo "$REPO" || true
    RUN_ID=$(gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH" -f skip_pack_e2e="$SKIP_PACK" --json 2>/dev/null | jq -r '.run_id' || true)
    if [[ -z "${RUN_ID}" || "${RUN_ID}" == "null" ]]; then
      RUN_ID=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')
    fi
    START_TIME=$(date +%s)
  fi

  sleep "$POLL"
done

echo "🟢 Run started. Monitoring until completion..."
while :; do
  STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status -q .status)
  [[ "$STATUS" == "completed" ]] && break
  sleep "$POLL"
done

CONCLUSION=$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q .conclusion)
OUT_DIR="artifacts_download/$RUN_ID"
mkdir -p "$OUT_DIR"

echo "📦 Downloading artifacts..."
gh run download "$RUN_ID" --repo "$REPO" --dir "$OUT_DIR" || true

REPORT=$(find "$OUT_DIR" -name index.html | head -n 1 || true)

echo "==============================="
echo "FINAL RESULT: $CONCLUSION"
echo "Run URL:"
gh run view "$RUN_ID" --repo "$REPO" --json url -q .url
echo "Artifacts in: $OUT_DIR"
echo "==============================="

if [[ "$CONCLUSION" != "success" ]]; then
  echo "❌ Failure detected — last logs:"
  gh run view "$RUN_ID" --repo "$REPO" --log | tail -200 || true
else
  echo "✅ SUCCESS"
fi

if [[ -n "$REPORT" ]]; then
  echo "🌐 Opening Playwright report..."
  command -v open &>/dev/null && open "$REPORT" || true
  command -v xdg-open &>/dev/null && xdg-open "$REPORT" >/dev/null 2>&1 || true
fi
