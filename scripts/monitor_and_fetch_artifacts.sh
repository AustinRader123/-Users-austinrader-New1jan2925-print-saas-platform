#!/usr/bin/env bash
set -euo pipefail

# Defaults (override via env vars)
REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
WF="${WF:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"

POLL_INTERVAL="${POLL_INTERVAL:-15}"
QUEUE_TIMEOUT_MIN="${QUEUE_TIMEOUT_MIN:-6}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }
need gh
need jq

echo "🔎 Locating latest workflow run..." >&2
RUN_ID=$(gh run list \
  --repo "$REPO" \
  --workflow "$WF" \
  --branch "$BRANCH" \
  --limit 1 \
  --json databaseId \
  -q '.[0].databaseId' || true)

if [[ -z "${RUN_ID:-}" ]]; then
  echo "ℹ️ No existing run found — dispatching a new one..." >&2
  gh workflow run "$WF" --repo "$REPO" --ref "$BRANCH" -f skip_pack_e2e=false
  sleep 2
  RUN_ID=$(gh run list \
    --repo "$REPO" \
    --workflow "$WF" \
    --branch "$BRANCH" \
    --limit 1 \
    --json databaseId \
    -q '.[0].databaseId')
fi

echo "▶ Monitoring RUN_ID=$RUN_ID" >&2

start_time=$(date +%s)

while true; do
  STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status -q .status)
  echo "⏳ Status: $STATUS" >&2

  if [[ "$STATUS" == "completed" ]]; then
    break
  fi

  # Handle long queue wait
  if [[ "$STATUS" == "queued" ]]; then
    now=$(date +%s)
    mins=$(( (now - start_time) / 60 ))
    if (( mins > QUEUE_TIMEOUT_MIN )); then
      echo "⚠️ Run stuck queued > ${QUEUE_TIMEOUT_MIN}m → cancelling + re-dispatch" >&2
      gh run cancel "$RUN_ID" --repo "$REPO" || true
      sleep 3
      gh workflow run "$WF" --repo "$REPO" --ref "$BRANCH" -f skip_pack_e2e=false
      echo "ℹ️ Re-dispatched; exiting so caller can re-run monitor." >&2
      exit 0
    fi
  fi

  sleep "$POLL_INTERVAL"
done

echo "✅ Run completed — downloading artifacts" >&2

OUT="artifacts_download/$RUN_ID"
mkdir -p "$OUT"
gh run download "$RUN_ID" --repo "$REPO" --dir "$OUT" || true

echo
echo "📦 Artifacts:"
ls -R "$OUT" || true

echo
echo "🧪 Early diagnostics:"
find "$OUT" -maxdepth 4 -type f -path "*early-diagnostics*" -print || true

echo
REPORT=$(find "$OUT" -maxdepth 4 -name "index.html" | head -n 1)
if [[ -n "$REPORT" ]]; then
  echo "📊 Opening Playwright report → $REPORT"
  if command -v open >/dev/null 2>&1; then
    open "$REPORT" 2>/dev/null || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$REPORT" 2>/dev/null || true
  fi
fi

CONCLUSION=$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q .conclusion)
URL=$(gh run view "$RUN_ID" --repo "$REPO" --json url -q .url)

echo
echo "📋 FINAL SUMMARY"
echo "Run: $RUN_ID"
echo "Conclusion: ${CONCLUSION:-null}"
echo "URL: $URL"
echo "Artifacts dir: $OUT"