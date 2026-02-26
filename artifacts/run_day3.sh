#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/austinrader/feb1"
LOG_DIR="$ROOT/artifacts/logs"
mkdir -p "$LOG_DIR"

echo "=== Ensure mock DN server is running on :6060 ==="
lsof -ti tcp:6060 | xargs -r kill -9 || true
nohup node "$ROOT/mock-dn/server.js" > "$LOG_DIR/mock-dn-6060.log" 2>&1 &
sleep 1
lsof -nP -iTCP:6060 -sTCP:LISTEN || { echo "Mock not listening"; exit 1; }

echo "=== Run Day-3 idempotency ==="
chmod +x "$ROOT/scripts/day3-idempotency.sh"
NODE_PATH="$ROOT/backend/node_modules" \
"$ROOT/scripts/day3-idempotency.sh" \
| tee "$LOG_DIR/day3-idempotency.run.log"

echo "=== Quick DB snapshot ==="
cd "$ROOT/backend"
node - <<'NODE'
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const models = [
    "InventoryEvent",
    "DnInventoryEventMap",
    "IntegrationPayloadSnapshot",
    "SyncRun"
  ];
  for (const m of models) {
    try {
      console.log(`${m}: ${await p[m].count()}`);
    } catch (e) {
      console.log(`${m}: (missing)`);
    }
  }
  await p.$disconnect();
})();
NODE

echo "=== DONE ==="
echo "Logs:"
echo " - $LOG_DIR/mock-dn-6060.log"
echo " - $LOG_DIR/day3-idempotency.run.log"
