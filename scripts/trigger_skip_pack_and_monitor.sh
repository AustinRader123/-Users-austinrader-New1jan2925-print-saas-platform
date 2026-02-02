#!/usr/bin/env bash
# Trigger a pack-skipped run (faster isolation) + monitor + auto-download artifacts
# Requirements: gh (GitHub CLI) authenticated + jq installed

set -euo pipefail

REPO="AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform"
WORKFLOW="nightly-e2e.yml"
BRANCH="chore/nightly-regression-pass"
SKIP_PACK="true"

echo "==> Dispatching workflow: $WORKFLOW on $BRANCH (skip_pack_e2e=$SKIP_PACK)"
gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH" -f "skip_pack_e2e=$SKIP_PACK"

echo "==> Finding latest run id for this workflow/branch..."
RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')"
echo "RUN_ID=$RUN_ID"
echo "==> Run URL:"
gh run view "$RUN_ID" --repo "$REPO" --json url -q '.url'

ART_DIR="artifacts_download/${RUN_ID}"
mkdir -p "$ART_DIR"

echo "==> Watching until completion..."
while :; do
  STATUS="$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status')"
  CONCLUSION="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q '.conclusion')"

  echo "status=$STATUS conclusion=${CONCLUSION:-null}"
  if [[ "$STATUS" == "completed" ]]; then
    break
  fi
  sleep 15
done

echo "==> Final:"
gh run view "$RUN_ID" --repo "$REPO"

echo "==> Attempting to download artifacts (if any) to: $ART_DIR"
# This will exit non-zero if there are no artifacts, so we guard it.
if gh run download "$RUN_ID" --repo "$REPO" --dir "$ART_DIR" 2>/dev/null; then
  echo "==> Artifacts downloaded:"
  find "$ART_DIR" -maxdepth 3 -type f | sed 's|^| - |'
else
  echo "==> No artifacts available for this run."
fi

echo "==> If you want logs right now, run:"
echo "gh run view $RUN_ID --repo \"$REPO\" --log"