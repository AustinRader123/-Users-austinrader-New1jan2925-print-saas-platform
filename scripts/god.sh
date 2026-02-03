#!/usr/bin/env bash
set -euo pipefail

# God script: dispatch both E2E lanes, watch, download artifacts, and summarize.
# macOS-compatible, minimal GNU assumptions.

REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"
BASE_URL_OVERRIDE="${BASE_URL_OVERRIDE:-}" # optional: overrides base URL precedence

POLL_SECS="${POLL_SECS:-15}"
QUEUE_STUCK_MIN="${QUEUE_STUCK_MIN:-5}"
MAX_REDISPATCH="${MAX_REDISPATCH:-3}"
TIMEOUT_MIN="${TIMEOUT_MIN:-120}"
OUT_ROOT="${OUT_ROOT:-artifacts_download}"

say() { printf "\n\033[1m%s\033[0m\n" "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing dependency: $1. Install it and retry."; }

ensure_tools() {
  say "==> Tooling checks"
  for t in gh jq git node npm; do need "$t"; done
  if ! gh auth status >/dev/null 2>&1; then
    die "GitHub CLI not authenticated. Run: gh auth login"
  fi
}

ensure_repo_remote() {
  say "==> Ensure repo remote"
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Run inside your repo working directory."
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/${REPO}.git"
  fi
}

ensure_branch() {
  say "==> Ensure branch exists: ${BRANCH}"
  local current
  current="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$current" != "$BRANCH" ]]; then
    # create or switch
    if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
      git checkout "$BRANCH"
    else
      # try from main; fallback to current HEAD
      if git show-ref --verify --quiet refs/heads/main; then
        git checkout -b "$BRANCH" main
      else
        git checkout -b "$BRANCH"
      fi
    fi
  fi
}

push_optional() {
  if [[ "${PUSH:-1}" == "1" ]]; then
    say "==> Push branch"
    git push -u origin "$BRANCH" || true
  fi
}

dispatch_once() {
  # args: skip_pack_e2e (true/false)
  local skip="$1"
  local args=(workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH" -F skip_pack_e2e="$skip" -F suite=regression)
  if [[ -n "$BASE_URL_OVERRIDE" ]]; then
    args+=( -F base_url="$BASE_URL_OVERRIDE" )
  fi
  say "==> Dispatch skip_pack_e2e=${skip}"
  gh "${args[@]}" >/dev/null
  # Find the latest run id for this workflow + branch
  local run_id
  run_id=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')
  [[ -n "$run_id" ]] || die "Could not find run id after dispatch."
  echo "$run_id"
}

run_info() {
  local run_id="$1"
  gh run view "$run_id" --repo "$REPO" --json url,status,conclusion,createdAt --jq '.url+"|"+.status+"|"+.conclusion+"|"+.createdAt'
}

cancel_run() { gh run cancel "$1" --repo "$REPO" >/dev/null 2>&1 || true; }

download_artifacts() {
  local run_id="$1"; local outdir="$OUT_ROOT/$run_id"
  mkdir -p "$outdir"
  gh run download "$run_id" --repo "$REPO" -D "$outdir" >/dev/null 2>&1 || true
  echo "$outdir"
}

open_report_if_found() {
  local outdir="$1"
  local report
  report=$(find "$outdir" -type f -path "*playwright-report*index.html" -print -quit 2>/dev/null || true)
  if [[ -n "$report" ]]; then
    if command -v open >/dev/null 2>&1; then open "$report" >/dev/null 2>&1 || true; fi
    echo "Playwright report: $report"
  else
    echo "No Playwright report found under $outdir"
  fi
}

watch_run() {
  local run_id="$1"
  local t0; t0=$(date +%s)
  local queued_since=""; local redispatches=0
  while true; do
    local info; info=$(run_info "$run_id")
    local url status conclusion created
    IFS='|' read -r url status conclusion created <<<"$info"
    printf "status=%s conclusion=%s url=%s\n" "$status" "${conclusion:-}" "$url"

    # queued watchdog
    if [[ "$status" == "queued" ]]; then
      if [[ -z "$queued_since" ]]; then queued_since=$(date +%s); fi
      local now; now=$(date +%s)
      local mins=$(( (now - queued_since) / 60 ))
      if (( mins >= QUEUE_STUCK_MIN )); then
        if (( redispatches < MAX_REDISPATCH )); then
          say "==> Queued too long (>${QUEUE_STUCK_MIN}m). Cancel and re-dispatch."
          cancel_run "$run_id"
          local new_id; new_id=$(dispatch_once "${LAST_SKIP_PACK}" )
          run_id="$new_id"; queued_since=""; redispatches=$((redispatches+1))
          continue
        else
          die "Run stuck queued after ${MAX_REDISPATCH} redispatches: $url"
        fi
      fi
    fi

    # timeout watchdog
    local now; now=$(date +%s)
    local mins=$(( (now - t0) / 60 ))
    if (( mins >= TIMEOUT_MIN )); then
      die "Run timed out after ${TIMEOUT_MIN} minutes: $url"
    fi

    if [[ "$status" == "completed" ]]; then
      echo "$info"
      return 0
    fi
    sleep "$POLL_SECS"
  done
}

print_summary_block() {
  local label="$1"; local run_id="$2"; local outdir="$3"; local info
  info=$(run_info "$run_id")
  local url status conclusion created
  IFS='|' read -r url status conclusion created <<<"$info"
  say "==> Summary: ${label}"
  echo "RUN_ID: $run_id"
  echo "RUN_URL: $url"
  echo "STATUS: $status"
  echo "CONCLUSION: ${conclusion:-}" 
  echo "ARTIFACTS: $outdir"
  local early
  early=$(find "$outdir" -type f -path "*early-diagnostics*meta.txt" -print -quit 2>/dev/null || true)
  if [[ -n "$early" ]]; then
    echo "-- early-diagnostics/meta.txt (tail):"
    tail -n 200 "$early" || true
  fi
  local backend_log frontend_log
  backend_log=$(find "$outdir" -type f -name "backend.log" -print -quit 2>/dev/null || true)
  frontend_log=$(find "$outdir" -type f -name "frontend.log" -print -quit 2>/dev/null || true)
  [[ -n "$backend_log" ]] && echo "backend.log: $backend_log"
  [[ -n "$frontend_log" ]] && echo "frontend.log: $frontend_log"
  open_report_if_found "$outdir"
}

main() {
  ensure_tools
  ensure_repo_remote
  ensure_branch
  push_optional

  mkdir -p "$OUT_ROOT"

  # Lane 1: skip-pack true
  LAST_SKIP_PACK="true"
  local run1; run1=$(dispatch_once "true")
  say "==> Watching SKIP-PACK run: $run1"
  watch_run "$run1" >/dev/null
  local out1; out1=$(download_artifacts "$run1")
  print_summary_block "skip-pack" "$run1" "$out1"

  # Lane 2: full-pack
  LAST_SKIP_PACK="false"
  local run2; run2=$(dispatch_once "false")
  say "==> Watching FULL-PACK run: $run2"
  watch_run "$run2" >/dev/null
  local out2; out2=$(download_artifacts "$run2")
  print_summary_block "full-pack" "$run2" "$out2"

  # Exit nonzero if any failed
  local c1; c1=$(gh run view "$run1" --repo "$REPO" --json conclusion -q .conclusion)
  local c2; c2=$(gh run view "$run2" --repo "$REPO" --json conclusion -q .conclusion)
  if [[ "$c1" != "success" || "$c2" != "success" ]]; then
    die "One or both lanes failed. Check artifacts above and re-run."
  fi

  say "ALL DONE ✅"
}

main "$@"
