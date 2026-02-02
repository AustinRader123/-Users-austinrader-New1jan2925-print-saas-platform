#!/usr/bin/env bash
set -euo pipefail

# ====== CONFIG ======
OWNER="AustinRader123"
REPO="-Users-austinrader-New1jan2925-print-saas-platform"
OUT_DIR="artifacts_download"
RUN_ID="${1:-21605375582}"   # pass a run id or it uses default
# ====================

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
need gh
need jq

REPO_SLUG="$OWNER/$REPO"
mkdir -p "$OUT_DIR"

echo "Run: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"
echo

echo "== Status =="
gh run view "$RUN_ID" -R "$REPO_SLUG" --json status,conclusion,createdAt,updatedAt,headBranch,event \
  -q '"status=\(.status) conclusion=\(.conclusion) branch=\(.headBranch) event=\(.event) updated=\(.updatedAt)"' \
  || true
echo

echo "== Artifacts (remote) =="
COUNT="$(gh api -H "Accept: application/vnd.github+json" "/repos/$OWNER/$REPO/actions/runs/$RUN_ID/artifacts" | jq -r '.total_count')"
echo "total_count=$COUNT"
if [[ "$COUNT" != "0" ]]; then
  gh api -H "Accept: application/vnd.github+json" "/repos/$OWNER/$REPO/actions/runs/$RUN_ID/artifacts" \
    | jq -r '.artifacts[] | "- \(.name)  (size=\(.size_in_bytes) bytes)"'
else
  echo "(none yet)"
fi
echo

if [[ "$COUNT" != "0" ]]; then
  echo "== Downloading artifacts -> $OUT_DIR =="
  gh run download "$RUN_ID" -R "$REPO_SLUG" -D "$OUT_DIR"
  echo
fi

echo "== Local artifact files =="
find "$OUT_DIR" -maxdepth 4 -type f 2>/dev/null || true
echo

# Try to open Playwright report if it exists
REPORT_DIR=""
if [[ -d "$OUT_DIR/frontend/playwright-report" ]]; then
  REPORT_DIR="$OUT_DIR/frontend/playwright-report"
elif [[ -d "$OUT_DIR/playwright-report" ]]; then
  REPORT_DIR="$OUT_DIR/playwright-report"
fi

if [[ -n "$REPORT_DIR" ]]; then
  echo "== Playwright report found =="
  echo "$REPORT_DIR"
  echo
  INDEX="$REPORT_DIR/index.html"
  if [[ -f "$INDEX" ]]; then
    echo "Opening report: $INDEX"
    if command -v open >/dev/null 2>&1; then
      open "$INDEX"
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$INDEX" >/dev/null 2>&1 &
    else
      echo "No opener found. Manually open: $INDEX"
    fi
  else
    echo "No index.html found in report dir. Contents:"
    ls -la "$REPORT_DIR" || true
  fi
else
  echo "No playwright report folder found yet in $OUT_DIR."
fi
