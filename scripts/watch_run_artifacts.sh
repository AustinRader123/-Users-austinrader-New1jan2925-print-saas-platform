#!/usr/bin/env bash
set -euo pipefail

# Usage: watch_run_artifacts.sh [OWNER] [REPO] [RUN_ID] [OUT_DIR]
# Defaults:
#   OWNER: AustinRader123
#   REPO: -Users-austinrader-New1jan2925-print-saas-platform
#   RUN_ID: 21604833099
#   OUT_DIR: artifacts_download

OWNER="${1:-AustinRader123}"
REPO="${2:--Users-austinrader-New1jan2925-print-saas-platform}"
RUN_ID="${3:-21604833099}"
OUT_DIR="${4:-artifacts_download}"

mkdir -p "$OUT_DIR"

echo "Watching run: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"

# --- Poll until run completes ---
while :; do
  STATUS="$(gh run view "$RUN_ID" -R "$OWNER/$REPO" --json status -q '.status')"
  CONCLUSION="$(gh run view "$RUN_ID" -R "$OWNER/$REPO" --json conclusion -q '.conclusion' 2>/dev/null || true)"

  TS="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$TS] status=$STATUS conclusion=${CONCLUSION:-null}"

  if [[ "$STATUS" == "completed" ]]; then
    break
  fi
  sleep 15
done

echo
echo "== Final =="
gh run view "$RUN_ID" -R "$OWNER/$REPO"

echo
echo "== Artifacts list =="
ARTIFACTS_JSON="$(gh api -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/actions/runs/$RUN_ID/artifacts")"

echo "$ARTIFACTS_JSON" | jq -r '.artifacts[] | "• \(.name) (id=\(.id), size=\(.size_in_bytes))"'

COUNT="$(echo "$ARTIFACTS_JSON" | jq -r '.total_count')"
if [[ "${COUNT}" == "0" ]]; then
  echo
  echo "No artifacts found for this run."
  exit 0
fi

echo
echo "== Downloading artifacts to: $OUT_DIR =="
# gh downloads and auto-unzips into the directory by default
gh run download "$RUN_ID" -R "$OWNER/$REPO" -D "$OUT_DIR"

echo
echo "== Download complete. Folder contents: =="
find "$OUT_DIR" -maxdepth 3 -type f | sed 's|^\./||'

echo
echo "Done."