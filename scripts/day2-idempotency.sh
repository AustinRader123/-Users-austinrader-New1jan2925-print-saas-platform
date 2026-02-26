#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/artifacts/logs"
mkdir -p "$LOG_DIR"

echo "=================================================="
echo "DAY 3: Inventory Events bootstrap (smoke)"
echo "=================================================="

BOOT="$ROOT/scripts/run_register_and_bootstrap.sh"
if [ ! -f "$BOOT" ]; then
  echo "❌ Missing $BOOT"
  exit 1
fi
chmod +x "$BOOT"

# If you already use a debug flag for DN SDK logging, keep it on
export DN_SDK_DEBUG="${DN_SDK_DEBUG:-1}"

echo "===> Running register+bootstrap..."
"$BOOT" 2>&1 | tee "$LOG_DIR/day3-bootstrap-inventory-events.log"

echo ""
echo "===> Quick counts after bootstrap:"
cd "$ROOT/backend"

node - <<'NODE' | tee "$LOG_DIR/day3-inventoryevent-counts.log"
(async () => {
  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  const tables = [
    "InventoryEvent",
    "DnInventoryEventMap",
    "IntegrationPayloadSnapshot",
  ];

  try {
    for (const t of tables) {
      try {
        const c = await p[t].count();
        console.log(`${t}: ${c}`);
      } catch (e) {
        console.log(`${t}: (missing?) ${e.message}`);
      }
    }
  } finally {
    await p.$disconnect();
  }
})();
NODE

echo ""
echo "✅ Logs:"
echo "  - $LOG_DIR/day3-bootstrap-inventory-events.log"
echo "  - $LOG_DIR/day3-inventoryevent-counts.log"
