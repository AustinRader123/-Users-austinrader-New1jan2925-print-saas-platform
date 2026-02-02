#!/usr/bin/env bash
# Escalation script: if run stays queued too long,
# cancel it and re-dispatch with pack ENABLED (full path),
# then monitor and download artifacts.

set -euo pipefail

REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
QUEUE_TIMEOUT_MIN=${QUEUE_TIMEOUT_MIN:-5}          # cancel if queued longer than this
POLL_INTERVAL=${POLL_INTERVAL:-15}
OUT_DIR_BASE="${OUT_DIR_BASE:-artifacts_download}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
need gh
need jq

echo "==> Locating latest run..."
RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')"
echo "RUN_ID=$RUN_ID"

queued_secs=0
while :; do
  STATUS="$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status')"
  echo "status=$STATUS waited=${queued_secs}s"

  if [[ "$STATUS" != "queued" ]]; then
    echo "Run left queued state → continuing normally."
    break
  fi

  if (( queued_secs >= QUEUE_TIMEOUT_MIN*60 )); then
    echo "==> Queued too long. Cancelling run $RUN_ID"
    gh run cancel "$RUN_ID" --repo "$REPO" || true
    break
  fi

  sleep "$POLL_INTERVAL"
  queued_secs=$((queued_secs + POLL_INTERVAL))
done

# If we cancelled, re-dispatch FULL run (pack enabled)
STATUS="$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status' 2>/dev/null || echo "unknown")"
if [[ "$STATUS" == "completed" ]]; then
  CONCLUSION="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q '.conclusion')"
  if [[ "$CONCLUSION" == "cancelled" ]]; then
    echo "==> Re-dispatching FULL (pack enabled) run"
    gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH" -f "skip_pack_e2e=false"
    RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')"
    echo "NEW RUN_ID=$RUN_ID"
  fi
fi

ART_DIR="${OUT_DIR_BASE}/${RUN_ID}"
mkdir -p "$ART_DIR"

echo "==> Monitoring until completion..."
while :; do
  STATUS="$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status')"
  CONCLUSION="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q '.conclusion')"

  echo "status=$STATUS conclusion=${CONCLUSION:-null}"
  if [[ "$STATUS" == "completed" ]]; then
    break
  fi
  sleep "$POLL_INTERVAL"
done

echo "==> Final result:"
gh run view "$RUN_ID" --repo "$REPO" --json status,conclusion,url -q '{status: .status, conclusion: .conclusion, url: .url}'

echo "==> Downloading artifacts (if present)..."
if gh run download "$RUN_ID" --repo "$REPO" --dir "$ART_DIR" 2>/dev/null; then
  find "$ART_DIR" -type f | sed 's|^| - |'
else
  echo "No artifacts for this run."
fi

echo "Done."