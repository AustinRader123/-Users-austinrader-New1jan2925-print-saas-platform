#!/usr/bin/env bash
set -euo pipefail

# Summarize two lanes: skip-pack and pack-enabled (most recent runs)
# Usage:
#  REPO="owner/repo" BRANCH="chore/nightly-regression-pass" bash scripts/summarize_two_lanes.sh

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 127; }; }
need gh; need jq;

REPO="${REPO:-}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
OUT_ROOT="${OUT_ROOT:-artifacts_download}"

if [ -z "$REPO" ]; then echo "REPO is required" >&2; exit 2; fi

latest_runs_json=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 10 --json databaseId,createdAt,url,headSha,displayTitle || echo "[]")

echo "==> Latest 10 runs (id, title, url):"
echo "$latest_runs_json" | jq -r '.[] | "\(.databaseId)  \(.displayTitle)  \(.url)"'

for RUN_ID in $(echo "$latest_runs_json" | jq -r '.[].databaseId'); do
  status=$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status' || echo "unknown")
  conclusion=$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q '.conclusion // ""' || echo "")
  echo "\nRun $RUN_ID: status=$status conclusion=${conclusion:-}"
  OUT="$OUT_ROOT/$RUN_ID"
  mkdir -p "$OUT"
  gh run download "$RUN_ID" --repo "$REPO" --dir "$OUT" || true
  REPORT=$(find "$OUT" -type f -name index.html | grep -E 'playwright-report|playwright' | head -n 1 || true)
  if [ -n "$REPORT" ]; then echo "  report: $REPORT"; fi
done
