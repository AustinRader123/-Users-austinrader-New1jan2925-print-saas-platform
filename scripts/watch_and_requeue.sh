#!/usr/bin/env bash
set -euo pipefail

# ====== CONFIG (edit if needed) ======
OWNER="AustinRader123"
REPO="-Users-austinrader-New1jan2925-print-saas-platform"
WORKFLOW_FILE="nightly-e2e.yml"
BRANCH="chore/nightly-regression-pass"

# Your current run (from your screenshot)
RUN_ID="${1:-21605375582}"

# Inputs for the workflow dispatch
SKIP_PACK_E2E="false"

# Behavior
POLL_SECONDS=15
MAX_QUEUED_SECONDS=300        # if queued > this, cancel + re-dispatch (5 min)
MAX_WATCH_SECONDS=7200        # give up after 2 hours
OUT_DIR="artifacts_download"
# ====================================

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1"; exit 1; }; }
need gh
need jq

REPO_SLUG="$OWNER/$REPO"
mkdir -p "$OUT_DIR"

echo "Repo: $REPO_SLUG"
echo "Workflow: $WORKFLOW_FILE"
echo "Branch: $BRANCH"
echo "Run ID: $RUN_ID"
echo "Inputs: skip_pack_e2e=$SKIP_PACK_E2E"
echo

run_url() { echo "https://github.com/$OWNER/$REPO/actions/runs/$1"; }

get_status() {
  gh run view "$1" -R "$REPO_SLUG" --json status,conclusion -q '{status: .status, conclusion: .conclusion}'
}

list_artifacts_count() {
  gh api -H "Accept: application/vnd.github+json" \
    "/repos/$OWNER/$REPO/actions/runs/$1/artifacts" \
    | jq -r '.total_count'
}

download_artifacts() {
  local rid="$1"
  echo "Downloading artifacts for run $rid -> $OUT_DIR"
  gh run download "$rid" -R "$REPO_SLUG" -D "$OUT_DIR"
  echo "Files downloaded:"
  find "$OUT_DIR" -maxdepth 4 -type f | sed 's|^\./||'
}

dispatch_new_run() {
  echo "Dispatching a NEW run..."
  gh workflow run "$WORKFLOW_FILE" \
    --repo "$REPO_SLUG" \
    --ref "$BRANCH" \
    -f "skip_pack_e2e=$SKIP_PACK_E2E"
}

find_latest_run_id_for_branch() {
  gh run list \
    --repo "$REPO_SLUG" \
    --workflow "$WORKFLOW_FILE" \
    --json databaseId,headBranch,createdAt \
  | jq -r --arg BR "$BRANCH" '
      map(select(.headBranch == $BR))
      | sort_by(.createdAt) | reverse
      | .[0].databaseId // empty
    '
}

cancel_run_if_active() {
  local rid="$1"
  local status
  status="$(gh run view "$rid" -R "$REPO_SLUG" --json status -q '.status' 2>/dev/null || echo "")"
  if [[ "$status" == "queued" || "$status" == "in_progress" ]]; then
    echo "Cancelling run $rid (status=$status)..."
    gh run cancel "$rid" -R "$REPO_SLUG" || true
  else
    echo "Not cancelling run $rid (status=$status)."
  fi
}

START_TS="$(date +%s)"
QUEUED_SINCE_TS=""
CURRENT_RUN="$RUN_ID"

echo "Watching: $(run_url "$CURRENT_RUN")"
echo

while :; do
  NOW="$(date +%s)"
  ELAPSED=$((NOW - START_TS))
  if (( ELAPSED > MAX_WATCH_SECONDS )); then
    echo "ERROR: Timed out after ${MAX_WATCH_SECONDS}s watching runs."
    echo "Last run: $(run_url "$CURRENT_RUN")"
    exit 1
  fi

  STATUS_JSON="$(get_status "$CURRENT_RUN")"
  STATUS="$(echo "$STATUS_JSON" | jq -r '.status')"
  CONCLUSION="$(echo "$STATUS_JSON" | jq -r '.conclusion // empty')"
  TS="$(date '+%Y-%m-%d %H:%M:%S')"

  echo "[$TS] run=$CURRENT_RUN status=$STATUS conclusion=${CONCLUSION:-null}"

  if [[ "$STATUS" == "queued" ]]; then
    # start queued timer
    if [[ -z "${QUEUED_SINCE_TS}" ]]; then
      QUEUED_SINCE_TS="$NOW"
    fi

    QUEUED_FOR=$((NOW - QUEUED_SINCE_TS))
    if (( QUEUED_FOR >= MAX_QUEUED_SECONDS )); then
      echo
      echo "Queued for ${QUEUED_FOR}s (>= ${MAX_QUEUED_SECONDS}s)."
      echo "Cancelling + re-dispatching to try to jump the queue..."
      cancel_run_if_active "$CURRENT_RUN"

      dispatch_new_run

      # Wait briefly for the new run to appear
      sleep 5
      NEW_RUN="$(find_latest_run_id_for_branch)"
      if [[ -z "$NEW_RUN" ]]; then
        echo "ERROR: Dispatched, but couldn't find a new run id."
        exit 1
      fi

      CURRENT_RUN="$NEW_RUN"
      QUEUED_SINCE_TS=""
      echo "Now watching NEW run: $CURRENT_RUN"
      echo "URL: $(run_url "$CURRENT_RUN")"
      echo
    fi

  elif [[ "$STATUS" == "in_progress" ]]; then
    QUEUED_SINCE_TS="" # reset queued timer once it starts
  elif [[ "$STATUS" == "completed" ]]; then
    echo
    echo "Completed: conclusion=${CONCLUSION:-null}"
    echo "Run URL: $(run_url "$CURRENT_RUN")"

    COUNT="$(list_artifacts_count "$CURRENT_RUN")"
    echo "Artifacts count: $COUNT"

    if [[ "$COUNT" != "0" ]]; then
      download_artifacts "$CURRENT_RUN"
    else
      echo "No artifacts to download."
    fi

    echo
    echo "DONE."
    exit 0
  fi

  sleep "$POLL_SECONDS"
done
