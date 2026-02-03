#!/usr/bin/env bash
set -euo pipefail

# CI Autopilot: cancel stale runs, dispatch nightly E2E, auto-handle queue timeouts,
# escalate to full-pack if needed, monitor to completion, summarize, download artifacts,
# and open Playwright report when present.
#
# Usage:
#   bash scripts/full_ci_autopilot.sh
#   SKIP_PACK=true bash scripts/full_ci_autopilot.sh
#   REPO="owner/repo" BRANCH="branch-name" bash scripts/full_ci_autopilot.sh

REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
SKIP_PACK="${SKIP_PACK:-true}"
QUEUE_TIMEOUT="${QUEUE_TIMEOUT:-300}"   # seconds queued before escalation
POLL="${POLL:-15}"                       # polling interval

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
need gh
need jq

cancel_stale_runs() {
  echo "== Cancel queued/in_progress runs on $BRANCH =="
  gh run list --repo "$REPO" --workflow "$WORKFLOW" --json databaseId,status,headBranch \
    -q ".[] | select((.status==\"queued\" or .status==\"in_progress\") and .headBranch==\"$BRANCH\") | .databaseId" \
    | while read -r run; do
        [[ -z "$run" ]] && continue
        echo "Canceling run $run"
        gh run cancel "$run" --repo "$REPO" || true
      done
}

dispatch_workflow() {
  local skip_flag="$1"
  echo "== Dispatch workflow: $WORKFLOW on $BRANCH (skip_pack_e2e=$skip_flag) ==" >&2
  gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH" -f "skip_pack_e2e=$skip_flag" || true
  # find latest run id for this workflow+branch
  local rid
  rid="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')"
  echo "$rid"
}

print_run_url() {
  local rid="$1"
  gh run view "$rid" --repo "$REPO" --json url -q .url
}

monitor_until_started_or_escalate() {
  local rid="$1"
  local skip_flag="$2"
  local started_ts="$(date +%s)"
  local status
  while :; do
    status="$(gh run view "$rid" --repo "$REPO" --json status -q .status)"
    if [[ "$status" != "queued" ]]; then
      echo "$rid"
      return 0
    fi
    local now="$(date +%s)"
    local elapsed=$((now - started_ts))
    echo "[queue] run=$rid status=$status elapsed=${elapsed}s" >&2
    if (( elapsed > QUEUE_TIMEOUT )); then
      echo "== Queued too long. Canceling $rid and escalating. ==" >&2
      gh run cancel "$rid" --repo "$REPO" || true
      # Escalate to full pack if we were skipping
      if [[ "$skip_flag" == "true" ]]; then
        skip_flag="false"
      fi
      rid="$(dispatch_workflow "$skip_flag")"
      echo "== New run: $rid ==" >&2
      started_ts="$(date +%s)"
    fi
    sleep "$POLL"
  done
}

monitor_until_complete() {
  local rid="$1"
  local status
  while :; do
    status="$(gh run view "$rid" --repo "$REPO" --json status -q .status)"
    local conclusion="$(gh run view "$rid" --repo "$REPO" --json conclusion -q .conclusion || echo null)"
    echo "[watch] run=$rid status=$status conclusion=${conclusion:-null}"
    [[ "$status" == "completed" ]] && break
    sleep "$POLL"
  done
}

final_summary() {
  local rid="$1"
  gh run view "$rid" --repo "$REPO" --json status,conclusion,url,createdAt,updatedAt,event,headBranch,headSha \
    -q '"url=" + .url + "\nstatus=" + .status + "\nconclusion=" + (.conclusion // "null") + "\nbranch=" + .headBranch + "\nsha=" + .headSha + "\nevent=" + .event + "\ncreatedAt=" + .createdAt + "\nupdatedAt=" + .updatedAt'
}

download_artifacts_and_open_report() {
  local rid="$1"
  local out_dir="artifacts_download/$rid"
  mkdir -p "$out_dir"
  echo "== Download artifacts to: $out_dir =="
  if gh run download "$rid" --repo "$REPO" --dir "$out_dir" 2>/dev/null; then
    echo "Artifacts downloaded:"
    find "$out_dir" -maxdepth 4 -type f | sed 's|^| - |'
    local report_dir
    report_dir="$(find "$out_dir" -type d -name "playwright-report" -print -quit || true)"
    if [[ -n "$report_dir" ]]; then
      local index_html="$report_dir/index.html"
      if [[ -f "$index_html" ]]; then
        echo "Opening Playwright report: $index_html"
        command -v open >/dev/null 2>&1 && open "$index_html" || true
        command -v xdg-open >/dev/null 2>&1 && xdg-open "$index_html" >/dev/null 2>&1 || true
      else
        echo "playwright-report folder found but no index.html"
      fi
    else
      echo "No playwright-report folder present in artifacts."
    fi
  else
    echo "No valid artifacts found to download."
  fi
}

# --- Orchestration ---
cancel_stale_runs
RUN_ID="$(dispatch_workflow "$SKIP_PACK")"
RUN_URL="$(print_run_url "$RUN_ID")"
echo "Run URL: $RUN_URL"

RUN_ID="$(monitor_until_started_or_escalate "$RUN_ID" "$SKIP_PACK")"
monitor_until_complete "$RUN_ID"

echo "== FINAL SUMMARY =="
final_summary "$RUN_ID"

download_artifacts_and_open_report "$RUN_ID"

# If failure, show quick log tail if available
CONCLUSION="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion -q .conclusion || echo null)"
if [[ "$CONCLUSION" != "success" ]]; then
  echo "Failure detected — attempting last logs tail:"
  gh run view "$RUN_ID" --repo "$REPO" --log | tail -200 || true
fi

echo "Done."
