#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/proc.sh"

BACKEND_PORT="${BACKEND_PORT:-3100}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
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

echo "[phase2b] doctor preflight"
(cd "$ROOT_DIR/backend" && DOCTOR_ALLOW_BUSY_PORTS=1 BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" BASE_URL="$BASE_URL" npm run doctor)

echo "[phase2b] clean start"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" npm run stop)

echo "[phase2b] start backend on :$BACKEND_PORT"
start_cmd "backend-smoke" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase2b] backend failed to open :$BACKEND_PORT"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

json_field() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const v=JSON.parse(d||'{}')['${field}']; process.stdout.write(v==null?'':String(v));});"
}

echo "[phase2b] resolving tenant/store IDs"
ids_json=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)
if [[ -z "$tenant_id" || -z "$store_id" ]]; then
  echo "[phase2b] missing tenant/store IDs"
  exit 1
fi

echo "[phase2b] login admin"
login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -H "x-tenant-id: $tenant_id" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
if [[ -z "$token" ]]; then
  echo "[phase2b] login failed"
  exit 1
fi

auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase2b] resolve product + variant"
products_json=$(curl --fail --silent --show-error "$BASE_URL/api/products?storeId=$store_id" "${auth_headers[@]}")
product_id=$(printf '%s' "$products_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d||'[]');process.stdout.write(a?.[0]?.id||'');});")
variant_id=$(printf '%s' "$products_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d||'[]');process.stdout.write(a?.[0]?.variants?.[0]?.id||'');});")
if [[ -z "$product_id" || -z "$variant_id" ]]; then
  echo "[phase2b] failed to resolve product/variant"
  exit 1
fi

echo "[phase2b] create design"
design_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/designs" "${auth_headers[@]}" \
  -d '{"name":"Smoke Phase2B Design","description":"phase2b smoke","content":{"layers":[],"canvas":{"width":800,"height":600}}}')
design_id=$(printf '%s' "$design_json" | json_field id)
if [[ -z "$design_id" ]]; then
  echo "[phase2b] design creation failed"
  exit 1
fi

echo "[phase2b] upload design asset"
tmp_file=$(mktemp)
printf 'phase2b-smoke' > "$tmp_file"
upload_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/designs/$design_id/assets/upload" \
  -H "Authorization: Bearer $token" \
  -H "x-tenant-id: $tenant_id" \
  -F "storeId=$store_id" \
  -F "file=@$tmp_file;filename=smoke.txt;type=text/plain")
rm -f "$tmp_file"
asset_id=$(printf '%s' "$upload_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(j?.asset?.id||'');});")
if [[ -z "$asset_id" ]]; then
  echo "[phase2b] asset upload failed"
  exit 1
fi

echo "[phase2b] create quote + line item"
quote_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/quotes" "${auth_headers[@]}" \
  -d "{\"storeId\":\"$store_id\",\"customerName\":\"Phase2B Smoke\",\"customerEmail\":\"phase2b@example.com\"}")
quote_id=$(printf '%s' "$quote_json" | json_field id)
if [[ -z "$quote_id" ]]; then
  echo "[phase2b] quote create failed"
  exit 1
fi

item_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/quotes/$quote_id/items" "${auth_headers[@]}" \
  -d "{\"storeId\":\"$store_id\",\"productId\":\"$product_id\",\"variantId\":\"$variant_id\",\"qty\":{\"units\":12},\"decorationMethod\":\"SCREEN_PRINT\",\"decorationLocations\":[\"front\"]}")
item_id=$(printf '%s' "$item_json" | json_field id)
if [[ -z "$item_id" ]]; then
  echo "[phase2b] quote item failed"
  exit 1
fi

echo "[phase2b] convert quote -> order"
convert_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/quotes/$quote_id/convert" "${auth_headers[@]}" \
  -d "{\"storeId\":\"$store_id\"}")
order_id=$(printf '%s' "$convert_json" | json_field id)
if [[ -z "$order_id" ]]; then
  echo "[phase2b] quote conversion failed"
  exit 1
fi

echo "[phase2b] fetch order production job"
order_json=$(curl --fail --silent --show-error "$BASE_URL/api/orders/$order_id" "${auth_headers[@]}")
job_id=$(printf '%s' "$order_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(j?.productionJobs?.[0]?.id||'');});")
if [[ -z "$job_id" ]]; then
  echo "[phase2b] missing production job"
  exit 1
fi

echo "[phase2b] create proof request"
proof_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/proofs/request" "${auth_headers[@]}" \
  -d "{\"storeId\":\"$store_id\",\"orderId\":\"$order_id\",\"designId\":\"$design_id\",\"recipientEmail\":\"phase2b@example.com\"}")
proof_token=$(printf '%s' "$proof_json" | json_field token)
proof_id=$(printf '%s' "$proof_json" | json_field id)
if [[ -z "$proof_id" || -z "$proof_token" ]]; then
  echo "[phase2b] proof request failed"
  exit 1
fi

echo "[phase2b] approve proof via public token endpoint"
approve_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/proofs/public/$proof_token/approve" \
  -H 'Content-Type: application/json' \
  -d '{"comment":"approved by smoke"}')
approved_status=$(printf '%s' "$approve_json" | json_field status)
if [[ "$approved_status" != "APPROVED" ]]; then
  echo "[phase2b] proof approval failed"
  exit 1
fi

echo "[phase2b] generate production work-order PDF"
work_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/production/jobs/$job_id/work-order" "${auth_headers[@]}" -d '{}')
work_url=$(printf '%s' "$work_json" | json_field workOrderUrl)
if [[ -z "$work_url" ]]; then
  echo "[phase2b] work-order generation failed"
  exit 1
fi

echo "[phase2b] PASS design=$design_id quote=$quote_id order=$order_id proof=$proof_id job=$job_id workOrder=$work_url"
