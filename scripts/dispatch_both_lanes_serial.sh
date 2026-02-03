#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
WF="${WF:-nightly-e2e.yml}"
POLL="${POLL:-15}"

dispatch () {
  local SKIP="$1"
  echo "==> Dispatch skip_pack_e2e=$SKIP"
  gh workflow run "$WF" --repo "$REPO" --ref "$BRANCH" -f "skip_pack_e2e=$SKIP"
}

latest_run_id () {
  gh run list --repo "$REPO" --workflow "$WF" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId'
}

wait_complete () {
  local RUN_ID="$1"
  echo "==> Watch RUN_ID=$RUN_ID"
  while true; do
    local status conclusion
    status="$(gh run view "$RUN_ID" --repo "$REPO" --json status -q '.status')"
    conclusion="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q '.conclusion')"
    echo "==> status=$status conclusion=${conclusion:-}"
    [[ "$status" == "completed" ]] && break
    sleep "$POLL"
  done
}

download () {
  local RUN_ID="$1"
  local out="artifacts_download/$RUN_ID"
  mkdir -p "$out"
  echo "==> Download artifacts -> $out"
  gh run download "$RUN_ID" --repo "$REPO" --dir "$out" || true
  echo "==> Files:"
  (cd "$out" && find . -maxdepth 4 -type f | sed -n '1,200p') || true
}

run_lane () {
  local SKIP="$1"
  dispatch "$SKIP"
  echo "==> Waiting for run to appear..."
  sleep 5
  local RUN_ID
  RUN_ID="$(latest_run_id)"
  echo "==> RUN_ID=$RUN_ID (skip_pack_e2e=$SKIP)"
  wait_complete "$RUN_ID"
  download "$RUN_ID"
}

run_lane "true"
run_lane "false"

echo "==> DONE"
