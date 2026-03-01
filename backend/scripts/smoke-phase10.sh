#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/proc.sh"

BACKEND_PORT="${BACKEND_PORT:-3100}"
BASE_URL="${BASE_URL:-http://localhost:${BACKEND_PORT}}"
ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@demo.local}"
ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-AdminPass123!}"
PID_DIR="$ROOT_DIR/artifacts/pids"
LOG_DIR="$ROOT_DIR/artifacts/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

cleanup() {
  stop_pidfile "$PID_DIR/backend.pid"
  wait_port_closed "$BACKEND_PORT" 10 || true
}
trap cleanup EXIT INT TERM

json_field() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');const v=j['${field}'];process.stdout.write(v==null?'':String(v));});"
}

json_eval() {
  local expr="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');let v='';try{v=(function(){return ${expr};})();}catch{}process.stdout.write(v==null?'':String(v));});"
}

echo "[phase10] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase10] start backend"
start_cmd "backend-smoke-phase10" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase10.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase10] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const ownerStore=await prisma.store.findFirst({where:{tenantId:tenant?.id},orderBy:{createdAt:'asc'}}); const product=await prisma.product.findFirst({where:{storeId:ownerStore?.id,status:'ACTIVE'},include:{variants:{orderBy:{createdAt:'asc'},take:1}}}); console.log(JSON.stringify({tenantId:tenant?.id||'',ownerStoreId:ownerStore?.id||'',sourceProductId:product?.id||'',sourceVariantId:product?.variants?.[0]?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
owner_store_id=$(printf '%s' "$ids_json" | json_field ownerStoreId)
source_product_id=$(printf '%s' "$ids_json" | json_field sourceProductId)
source_variant_id=$(printf '%s' "$ids_json" | json_field sourceVariantId)

if [[ -z "$tenant_id" || -z "$owner_store_id" || -z "$source_product_id" || -z "$source_variant_id" ]]; then
  echo "[phase10] missing tenant/store/product/variant seed data"
  exit 1
fi

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

(cd "$ROOT_DIR/backend" && TENANT_ID="$tenant_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenantId=process.env.TENANT_ID; await prisma.featureOverride.upsert({ where:{ tenantId_key:{ tenantId, key:'fundraising.enabled' } }, update:{ enabled:true }, create:{ tenantId, key:'fundraising.enabled', enabled:true } }); await prisma.featureOverride.upsert({ where:{ tenantId_key:{ tenantId, key:'teamStores.enabled' } }, update:{ enabled:true }, create:{ tenantId, key:'teamStores.enabled', enabled:true } }); await prisma.\$disconnect();")

echo "[phase10] create team store + roster"
stamp="$(date +%s)"
team_slug="phase10-team-$stamp"
team_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/team-stores" "${auth_headers[@]}" -d "{\"storeId\":\"$owner_store_id\",\"slug\":\"$team_slug\",\"name\":\"Phase10 Team\",\"fundraiserPercent\":15,\"groupShipping\":true}")
team_store_id=$(printf '%s' "$team_json" | json_field id)
if [[ -z "$team_store_id" ]]; then
  echo "[phase10] failed to create team store"
  exit 1
fi

campaign_slug="phase10-campaign-$stamp"
echo "[phase10] create campaign"
campaign_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/campaigns?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"storeId\":\"$owner_store_id\",\"slug\":\"$campaign_slug\",\"name\":\"Phase 10 Campaign\",\"status\":\"ACTIVE\",\"shippingMode\":\"CONSOLIDATED\",\"allowSplitShip\":false,\"defaultFundraiserPercent\":12}")
campaign_id=$(printf '%s' "$campaign_json" | json_field id)
if [[ -z "$campaign_id" ]]; then
  echo "[phase10] failed to create campaign"
  exit 1
fi

curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/campaigns/$campaign_id/team-stores?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"teamStoreId\":\"$team_store_id\"}" >/dev/null
member_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/campaigns/$campaign_id/members?tenantId=$tenant_id" "${auth_headers[@]}" -d '{"displayName":"Phase10 Member","publicCode":"P10M1"}')
member_id=$(printf '%s' "$member_json" | json_field id)
if [[ -z "$member_id" ]]; then
  echo "[phase10] failed to create member"
  exit 1
fi

echo "[phase10] public cart + checkout with campaign attribution"
cart_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart" -H 'Content-Type: application/json' -d "{\"storeId\":\"$owner_store_id\",\"fundraiser\":{\"campaignId\":\"$campaign_id\",\"memberId\":\"$member_id\",\"teamStoreId\":\"$team_store_id\"}}")
cart_token=$(printf '%s' "$cart_json" | json_field token)

curl --fail --silent --show-error -X POST "$BASE_URL/api/public/cart/$cart_token/items" -H 'Content-Type: application/json' -d "{\"productId\":\"$source_product_id\",\"variantId\":\"$source_variant_id\",\"quantity\":2}" >/dev/null
checkout_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/public/checkout/$cart_token" -H 'Content-Type: application/json' -d '{"customerEmail":"phase10@example.test","customerName":"Phase 10","shippingAddress":{"line1":"123 Test St","city":"Testville"}}')
order_id=$(printf '%s' "$checkout_json" | json_field orderId)
if [[ -z "$order_id" ]]; then
  echo "[phase10] checkout did not return orderId"
  exit 1
fi

echo "[phase10] verify order attribution + ledger"
check_json=$(cd "$ROOT_DIR/backend" && ORDER_ID="$order_id" CAMPAIGN_ID="$campaign_id" MEMBER_ID="$member_id" node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const order=await prisma.order.findUnique({where:{id:process.env.ORDER_ID||''}}); const ledger=await prisma.fundraiserPayoutLedgerEntry.findMany({where:{campaignId:process.env.CAMPAIGN_ID||'',orderId:process.env.ORDER_ID||''}}); console.log(JSON.stringify({orderCampaignId:order?.fundraiserCampaignId||'',orderMemberId:order?.fundraiserMemberId||'',amount:order?.fundraiserAmountCents||0,ledgerCount:ledger.length,ledgerStatus:ledger[0]?.status||''})); await prisma.\$disconnect();")
order_campaign_id=$(printf '%s' "$check_json" | json_field orderCampaignId)
order_member_id=$(printf '%s' "$check_json" | json_field orderMemberId)
ledger_count=$(printf '%s' "$check_json" | json_field ledgerCount)

if [[ "$order_campaign_id" != "$campaign_id" || "$order_member_id" != "$member_id" || -z "$ledger_count" || "$ledger_count" == "0" ]]; then
  echo "[phase10] attribution or ledger verification failed"
  exit 1
fi

echo "[phase10] consolidation idempotency"
idem="phase10-$stamp"
run1=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/campaigns/$campaign_id/consolidate?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"idempotencyKey\":\"$idem\"}")
run2=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/campaigns/$campaign_id/consolidate?tenantId=$tenant_id" "${auth_headers[@]}" -d "{\"idempotencyKey\":\"$idem\"}")
run1_id=$(printf '%s' "$run1" | json_field id)
run2_id=$(printf '%s' "$run2" | json_field id)
if [[ -z "$run1_id" || "$run1_id" != "$run2_id" ]]; then
  echo "[phase10] consolidation idempotency failed"
  exit 1
fi

ledger_id=$(curl --fail --silent --show-error "$BASE_URL/api/fundraising/campaigns/$campaign_id/ledger?tenantId=$tenant_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" | json_eval 'j[0]?.id')
if [[ -z "$ledger_id" ]]; then
  echo "[phase10] missing ledger row"
  exit 1
fi

curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/ledger/$ledger_id/approve?tenantId=$tenant_id" "${auth_headers[@]}" -d '{}' >/dev/null
curl --fail --silent --show-error -X POST "$BASE_URL/api/fundraising/ledger/$ledger_id/pay?tenantId=$tenant_id" "${auth_headers[@]}" -d '{}' >/dev/null

echo "[phase10] PASS tenant=$tenant_id campaign=$campaign_id member=$member_id order=$order_id run=$run1_id"
