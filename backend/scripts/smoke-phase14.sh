#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "[phase14] scaffold smoke start"

health_json=$(cd "$ROOT_DIR/backend" && npx tsx -e "import { getPaymentsProvider } from './src/providers/payments/index.ts'; import { getShippingProvider } from './src/providers/shipping/index.ts'; import { getTaxProvider } from './src/providers/tax/index.ts'; (async () => { const payments = await getPaymentsProvider().healthcheck(); const shipping = await getShippingProvider().healthcheck(); const tax = await getTaxProvider().healthcheck(); const quote = await getTaxProvider().calculateTax({storeId:'smoke-store',subtotalCents:10000,shippingCents:1000}); console.log(JSON.stringify({payments,shipping,tax,quote})); })();")

echo "$health_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}'); if(!j.payments?.provider||!j.shipping?.provider||!j.tax?.provider){process.exit(1);} if(Number(j.quote?.totalCents||0)<=0){process.exit(1);} console.log('[phase14] provider scaffold checks ok');});"

echo "[phase14] PASS scaffold=true"
