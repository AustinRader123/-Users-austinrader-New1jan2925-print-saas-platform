#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# NEXT CODE: extend master.sh to become fully end-to-end
# - If DISPATCH=1 -> dispatch BOTH lanes (skip-pack + full-pack),
#   watch, download artifacts, auto-open each Playwright report.
# - If DISPATCH=0 -> behave like "finalize/open artifacts" mode
#   (what you already have).
#
# Assumes these scripts exist (from our earlier work):
#   scripts/dispatch_both_lanes_and_watch.sh
#   scripts/finalize_run_and_open_report.sh
#
# Usage:
#   DISPATCH=1 bash scripts/master.sh
#   DISPATCH=1 DO_PR=1 DO_MERGE=0 bash scripts/master.sh
#   RUN_ID=21616203471 DISPATCH=0 OPEN_LOGS=1 bash scripts/master.sh
# ============================================================

REPO="${REPO:-AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform}"
BRANCH="${BRANCH:-chore/nightly-regression-pass}"
WORKFLOW="${WORKFLOW:-nightly-e2e.yml}"

DISPATCH="${DISPATCH:-0}"      # 1 = dispatch+watch+download (both lanes)
RUN_ID="${RUN_ID:-}"           # optional: finalize a specific run
ARTIFACTS_DIR="${ARTIFACTS_DIR:-artifacts_download}"

# PR / merge controls
DO_PR="${DO_PR:-0}"
DO_MERGE="${DO_MERGE:-0}"
PR_TITLE="${PR_TITLE:-CI: stabilize nightly E2E + artifacts}"
PR_BODY="${PR_BODY:-Stabilizes nightly E2E, ensures artifacts + Playwright report download, adds fallback + diagnostics scripts.}"

# Optional diagnostics
OPEN_LOGS="${OPEN_LOGS:-0}"
PRINT_ARTIFACT_URLS="${PRINT_ARTIFACT_URLS:-0}"
EDITOR_CMD="${EDITOR_CMD:-}"

say() { printf "\n\033[1m%s\033[0m\n" "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing dependency: $1"; }

open_file() {
  local p="$1"
  if command -v open >/dev/null 2>&1; then
    open "$p" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$p" >/dev/null 2>&1 || true
  else
    echo "No opener found (open/xdg-open). File: $p"
  fi
}

open_in_editor() {
  local p="$1"
  if [[ -n "$EDITOR_CMD" ]]; then
    # shellcheck disable=SC2086
    $EDITOR_CMD "$p" >/dev/null 2>&1 || true
    return 0
  fi
  if command -v code >/dev/null 2>&1; then code -g "$p" >/dev/null 2>&1 || true; return 0; fi
  if command -v cursor >/dev/null 2>&1; then cursor -g "$p" >/dev/null 2>&1 || true; return 0; fi
  echo "Open manually: $p"
}

create_pr_and_optional_merge() {
  if [[ "$DO_PR" != "1" && "$DO_MERGE" != "1" ]]; then
    return 0
  fi

  say "==> PR/Merge: ensure branch pushed"
  local current
  current="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$current" != "$BRANCH" ]]; then
    echo "Switching to branch: $BRANCH"
    git checkout "$BRANCH"
  fi

  git push -u origin "$BRANCH"

  say "==> PR: create (or reuse existing)"
  set +e
  local pr_url
  pr_url="$(gh pr create --repo "$REPO" --head "$BRANCH" --title "$PR_TITLE" --body "$PR_BODY" 2>/dev/null)"
  local rc=$?
  set -e
  if [[ $rc -eq 0 && -n "$pr_url" ]]; then
    echo "PR created: $pr_url"
  else
    pr_url="$(gh pr view --repo "$REPO" --head "$BRANCH" --json url -q .url 2>/dev/null || true)"
    [[ -n "$pr_url" ]] && echo "PR exists: $pr_url" || echo "Could not create/find PR automatically."
  fi

  if [[ "$DO_MERGE" == "1" ]]; then
    say "==> Merge PR"
    gh pr merge --repo "$REPO" --merge --delete-branch --head "$BRANCH"
    echo "Merged."
  fi
}

finalize_local_artifacts_for_run() {
  say "==> Finalize: pick RUN_ID folder and open report"
  [[ -d "$ARTIFACTS_DIR" ]] || die "Artifacts directory not found: $ARTIFACTS_DIR"

  if [[ -z "$RUN_ID" ]]; then
    RUN_ID="$(ls -1t "$ARTIFACTS_DIR" 2>/dev/null | head -n 1 || true)"
    [[ -n "$RUN_ID" ]] || die "No run folders found in $ARTIFACTS_DIR. Set RUN_ID=..."
  fi

  local run_dir="$ARTIFACTS_DIR/$RUN_ID"
  [[ -d "$run_dir" ]] || die "Run folder not found: $run_dir"

  echo "Using RUN_ID: $RUN_ID"
  echo "RUN_DIR: $run_dir"

  local report
  report="$(find "$run_dir" -type f -path "*playwright-report*index.html" -print -quit 2>/dev/null || true)"
  if [[ -n "$report" ]]; then
    echo "Playwright report: $report"
    open_file "$report"
  else
    echo "No Playwright report found under $run_dir"
  fi

  local backend_log frontend_log
  backend_log="$(find "$run_dir" -type f -name "backend.log" -print -quit 2>/dev/null || true)"
  frontend_log="$(find "$run_dir" -type f -name "frontend.log" -print -quit 2>/dev/null || true)"

  if [[ -n "$backend_log" ]]; then
    echo "backend.log: $backend_log"
    tail -120 "$backend_log" || true
    [[ "$OPEN_LOGS" == "1" ]] && open_in_editor "$backend_log"
  fi
  if [[ -n "$frontend_log" ]]; then
    echo "frontend.log: $frontend_log"
    tail -120 "$frontend_log" || true
    [[ "$OPEN_LOGS" == "1" ]] && open_in_editor "$frontend_log"
  fi

  if [[ "$PRINT_ARTIFACT_URLS" == "1" ]]; then
    need jq
    if [[ "$RUN_ID" =~ ^[0-9]+$ ]]; then
      local api="repos/${REPO}/actions/runs/${RUN_ID}/artifacts"
      local json
      json="$(gh api "$api" 2>/dev/null || true)"
      if [[ -n "$json" ]]; then
        echo "$json" | jq -r '.artifacts[] | "\(.name)\n  expires_at: \(.expires_at)\n  download_url: \(.archive_download_url)\n"'
      else
        echo "Could not fetch artifacts via API for RUN_ID=$RUN_ID"
      fi
    else
      echo "RUN_ID '$RUN_ID' is not a GitHub run id (numeric)."
    fi
  fi
}

main() {
  say "==> Preconditions"
  need git
  need gh
  need find
  need tail

  if ! gh auth status >/dev/null 2>&1; then
    die "GitHub CLI not authenticated. Run: gh auth login"
  fi

  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Run from inside your git repo working directory."
  git status -sb || true

  if [[ "$DISPATCH" == "1" ]]; then
    say "==> DISPATCH=1: dispatch BOTH lanes and watch (end-to-end)"
    [[ -f scripts/dispatch_both_lanes_and_watch.sh ]] || die "Missing scripts/dispatch_both_lanes_and_watch.sh"
    chmod +x scripts/dispatch_both_lanes_and_watch.sh scripts/finalize_run_and_open_report.sh 2>/dev/null || true

    # IMPORTANT: this script is assumed to:
    #  - dispatch skip-pack and full-pack
    #  - watch to completion
    #  - download artifacts into artifacts_download/<RUN_ID>/
    #  - auto-open playwright report per lane when present
    REPO="$REPO" BRANCH="$BRANCH" WORKFLOW="$WORKFLOW" ARTIFACTS_DIR="$ARTIFACTS_DIR" \
      OPEN_LOGS="$OPEN_LOGS" PRINT_ARTIFACT_URLS="$PRINT_ARTIFACT_URLS" EDITOR_CMD="$EDITOR_CMD" \
      bash scripts/dispatch_both_lanes_and_watch.sh

    # After end-to-end run, optionally PR/merge
    create_pr_and_optional_merge
    say "DONE ✅"
    exit 0
  fi

  say "==> DISPATCH=0: finalize/open artifacts for existing RUN_ID"
  finalize_local_artifacts_for_run

  # Optionally PR/merge in finalize mode too
  create_pr_and_optional_merge

  say "DONE ✅"
}

main "$@"
