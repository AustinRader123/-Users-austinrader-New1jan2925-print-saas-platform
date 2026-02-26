#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/artifacts/logs"
mkdir -p "$LOG_DIR"

STORE_ID="${STORE_ID:-test-store}"
CONN_ID="${CONN_ID:-test-conn}"

echo "DAY 3: Inventory Events idempotency test"

echo "==> Capturing baseline counts"
node - <<'NODE' | tee "$LOG_DIR/day3_before_counts.log"
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  try {
    const ie = await p.inventoryEvent.count();
    const m = await p.dnInventoryEventMap.count();
    console.log(`InventoryEvent:${ie}`);
    console.log(`DnInventoryEventMap:${m}`);
  } finally { await p.$disconnect(); }
})();
NODE

# Run bootstrap twice
echo "==> Running bootstrap (1)"
# use existing bootstrap script
$ROOT/scripts/run_register_and_bootstrap.sh 2>&1 | tee "$LOG_DIR/day3_bootstrap_1.log"

echo "==> Running bootstrap (2)"
$ROOT/scripts/run_register_and_bootstrap.sh 2>&1 | tee "$LOG_DIR/day3_bootstrap_2.log"

# Compare counts
node - <<'NODE' | tee "$LOG_DIR/day3_after_counts.log"
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  try {
    const ie = await p.inventoryEvent.count();
    const m = await p.dnInventoryEventMap.count();
    console.log(`InventoryEvent:${ie}`);
    console.log(`DnInventoryEventMap:${m}`);
  } finally { await p.$disconnect(); }
})();
NODE

# Run invariants
echo "==> Running invariant check"
node backend/scripts/check-inventory-invariants.mjs | tee "$LOG_DIR/day3_invariants.log"

echo "Done. Logs:"
echo "  $LOG_DIR/day3_bootstrap_1.log"
echo "  $LOG_DIR/day3_bootstrap_2.log"
echo "  $LOG_DIR/day3_before_counts.log"
echo "  $LOG_DIR/day3_after_counts.log"
echo "  $LOG_DIR/day3_invariants.log"
