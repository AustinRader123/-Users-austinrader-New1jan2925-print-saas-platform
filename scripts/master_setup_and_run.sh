#!/usr/bin/env bash
# MASTER SETUP + RUN (Mac/Linux/Git-Bash). Installs deps, logs into GitHub, then runs your watcher script.
# Repo: AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform

set -euo pipefail

REPO="AustinRader123/-Users-austinrader-New1jan2925-print-saas-platform"
BRANCH="chore/nightly-regression-pass"
WORKFLOW="nightly-e2e.yml"

echo "==> 1) Ensure prerequisites (gh + jq)"
OS="$(uname -s 2>/dev/null || echo UNKNOWN)"

if ! command -v gh >/dev/null 2>&1; then
  echo "==> Installing GitHub CLI (gh)..."
  if [[ "$OS" == "Darwin" ]]; then
    command -v brew >/dev/null 2>&1 || { echo "ERROR: Homebrew not found. Install Homebrew first."; exit 1; }
    brew install gh
  elif [[ "$OS" == "Linux" ]]; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update -y
      sudo apt-get install -y gh
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y gh
    else
      echo "ERROR: Unsupported Linux package manager. Install gh manually: https://cli.github.com/"
      exit 1
    fi
  else
    echo "ERROR: Unsupported OS for auto-install. Install gh manually: https://cli.github.com/"
    exit 1
  fi
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "==> Installing jq..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install jq
  elif [[ "$OS" == "Linux" ]]; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get install -y jq
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y jq
    else
      echo "ERROR: Unsupported Linux package manager. Install jq manually."
      exit 1
    fi
  else
    echo "ERROR: Unsupported OS for auto-install. Install jq manually."
    exit 1
  fi
fi

echo "==> 2) GitHub auth (will prompt browser login if needed)"
if ! gh auth status >/dev/null 2>&1; then
  gh auth login
fi

echo "==> 3) Sanity check versions"
gh --version
jq --version

echo "==> 4) Validate repo access"
gh repo view "$REPO" >/dev/null

echo "==> 5) Ensure scripts exist and are executable"
if [[ -f scripts/watch_and_requeue.sh ]]; then chmod +x scripts/watch_and_requeue.sh; fi
if [[ -f scripts/dispatch_and_watch.sh ]]; then chmod +x scripts/dispatch_and_watch.sh; fi
if [[ -f scripts/finalize_run_and_open_report.sh ]]; then chmod +x scripts/finalize_run_and_open_report.sh; fi
if [[ -f scripts/escalate_queue_then_full_pack.sh ]]; then chmod +x scripts/escalate_queue_then_full_pack.sh; fi
if [[ -f scripts/ci-e2e.sh ]]; then chmod +x scripts/ci-e2e.sh; fi
if [[ -f scripts/dispatch_both_lanes_and_watch.sh ]]; then chmod +x scripts/dispatch_both_lanes_and_watch.sh; fi

echo "==> 6) Dispatch a fresh workflow run (pack enabled by default; set skip_pack_e2e=true to skip)"
# Change -f skip_pack_e2e=false to true if you want pack skipped
gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH" -f skip_pack_e2e=false

echo "==> 7) Grab latest RUN_ID for this workflow+branch"
RUN_ID="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')"
echo "==> Latest RUN_ID=$RUN_ID"

echo "==> 8) Watch until completion, then download artifacts and open report (if your script supports it)"
if [[ -f scripts/finalize_run_and_open_report.sh ]]; then
  REPO="$REPO" RUN_ID="$RUN_ID" bash scripts/finalize_run_and_open_report.sh
elif [[ -f scripts/watch_and_requeue.sh ]]; then
  # This one will re-dispatch if queued too long and then download artifacts
  REPO="$REPO" RUN_ID="$RUN_ID" WORKFLOW="$WORKFLOW" BRANCH="$BRANCH" bash scripts/watch_and_requeue.sh
else
  echo "==> No finalize/watcher script found. Falling back to basic gh watch + artifact list."
  gh run watch "$RUN_ID" --repo "$REPO" --exit-status
  gh run view "$RUN_ID" --repo "$REPO" --json conclusion,status,url
  gh run download "$RUN_ID" --repo "$REPO" --dir "artifacts_download/${RUN_ID}"
  echo "==> Downloaded artifacts to artifacts_download/${RUN_ID}"
fi

echo "==> 9) Optionally dispatch both lanes and watch"
if [[ -f scripts/dispatch_both_lanes_and_watch.sh ]]; then
  bash scripts/dispatch_both_lanes_and_watch.sh
fi

echo "==> DONE"
