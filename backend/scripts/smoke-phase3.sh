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

json_field() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}'); const v=j['${field}']; process.stdout.write(v==null?'':String(v));});"
}

echo "[phase3] clean start"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" npm run stop)

echo "[phase3] migrate + seed"
(cd "$ROOT_DIR/backend" && npm run db:deploy && npm run db:seed)

echo "[phase3] start backend on :$BACKEND_PORT"
start_cmd "backend-smoke-phase3" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase3.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase3] backend failed to open :$BACKEND_PORT"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)

if [[ -z "$tenant_id" || -z "$store_id" ]]; then
  echo "[phase3] missing tenant/store seed data"
  exit 1
fi

echo "[phase3] login admin"
login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -H "x-tenant-id: $tenant_id" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

token=$(printf '%s' "$login_resp" | json_field token)
if [[ -z "$token" ]]; then
  echo "[phase3] login failed"
  exit 1
fi

auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase3] ensure mock supplier connection"
conn_resp=$(curl --silent --show-error "$BASE_URL/api/admin/suppliers/connections?storeId=$store_id" "${auth_headers[@]}" -w $'\n%{http_code}')
conn_json=${conn_resp%$'\n'*}
conn_code=${conn_resp##*$'\n'}
if [[ "$conn_code" != "200" ]]; then
  echo "[phase3] list connections failed (http=$conn_code body=$conn_json)"
  exit 1
fi

connection_id=$(printf '%s' "$conn_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'[]');const c=(j||[]).find((x)=>x.supplier==='MOCK');process.stdout.write(c?.id||'');});")
if [[ -z "$connection_id" ]]; then
  create_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/admin/suppliers/connections" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"supplier\":\"MOCK\",\"name\":\"Smoke Mock Supplier\",\"authType\":\"MOCK\",\"credentials\":{\"mode\":\"mock\"}}" -w $'\n%{http_code}')
  create_json=${create_resp%$'\n'*}
  create_code=${create_resp##*$'\n'}
  if [[ "$create_code" != "201" ]]; then
    echo "[phase3] create connection failed (http=$create_code body=$create_json)"
    exit 1
  fi
  connection_id=$(printf '%s' "$create_json" | json_field id)
fi

if [[ -z "$connection_id" ]]; then
  echo "[phase3] missing connection id"
  exit 1
fi

echo "[phase3] test supplier connection"
test_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/admin/suppliers/connections/$connection_id/test" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}" -w $'\n%{http_code}')
test_json=${test_resp%$'\n'*}
test_code=${test_resp##*$'\n'}
if [[ "$test_code" != "200" ]]; then
  echo "[phase3] test failed (http=$test_code body=$test_json)"
  exit 1
fi
ok=$(printf '%s' "$test_json" | json_field ok)
if [[ "$ok" != "true" ]]; then
  echo "[phase3] adapter test not ok"
  exit 1
fi

echo "[phase3] run first sync"
sync1_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/admin/suppliers/connections/$connection_id/sync" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"queue\":false,\"includeImages\":true}" -w $'\n%{http_code}')
sync1_json=${sync1_resp%$'\n'*}
sync1_code=${sync1_resp##*$'\n'}
if [[ "$sync1_code" != "200" ]]; then
  echo "[phase3] first sync failed (http=$sync1_code body=$sync1_json)"
  exit 1
fi

sync1_status=$(printf '%s' "$sync1_json" | json_field status)
if [[ "$sync1_status" != "SUCCEEDED" ]]; then
  echo "[phase3] first sync status not succeeded ($sync1_status)"
  exit 1
fi

created_products=$(printf '%s' "$sync1_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(String(j?.counts?.productsCreated ?? '0'));});")
if [[ "$created_products" -lt 1 ]]; then
  echo "[phase3] expected productsCreated > 0 on first sync"
  exit 1
fi

echo "[phase3] run second sync (idempotency)"
sync2_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/admin/suppliers/connections/$connection_id/sync" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"queue\":false,\"includeImages\":true}" -w $'\n%{http_code}')
sync2_json=${sync2_resp%$'\n'*}
sync2_code=${sync2_resp##*$'\n'}
if [[ "$sync2_code" != "200" ]]; then
  echo "[phase3] second sync failed (http=$sync2_code body=$sync2_json)"
  exit 1
fi

sync2_status=$(printf '%s' "$sync2_json" | json_field status)
if [[ "$sync2_status" != "SUCCEEDED" ]]; then
  echo "[phase3] second sync status not succeeded ($sync2_status)"
  exit 1
fi

created_products_2=$(printf '%s' "$sync2_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(String(j?.counts?.productsCreated ?? '0'));});")
created_variants_2=$(printf '%s' "$sync2_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(String(j?.counts?.variantsCreated ?? '0'));});")
if [[ "$created_products_2" != "0" || "$created_variants_2" != "0" ]]; then
  echo "[phase3] idempotency failed (productsCreated=$created_products_2 variantsCreated=$created_variants_2)"
  exit 1
fi

echo "[phase3] verify run logs + maps"
verify_json=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const connectionId='${connection_id}'; const runs=await prisma.supplierSyncRun.count({where:{supplierConnectionId:connectionId}}); const pm=await prisma.externalProductMap.count({where:{supplierConnectionId:connectionId}}); const vm=await prisma.externalVariantMap.count({where:{supplierConnectionId:connectionId}}); const im=await prisma.externalImageMap.count({where:{supplierConnectionId:connectionId}}); console.log(JSON.stringify({runs,pm,vm,im})); await prisma.\$disconnect();")
runs=$(printf '%s' "$verify_json" | json_field runs)
pmaps=$(printf '%s' "$verify_json" | json_field pm)
vmaps=$(printf '%s' "$verify_json" | json_field vm)
imaps=$(printf '%s' "$verify_json" | json_field im)

if [[ "$runs" -lt 2 || "$pmaps" -lt 1 || "$vmaps" -lt 1 || "$imaps" -lt 1 ]]; then
  echo "[phase3] verification failed runs=$runs productMaps=$pmaps variantMaps=$vmaps imageMaps=$imaps"
  exit 1
fi

echo "[phase3] PASS connection=$connection_id runs=$runs productMaps=$pmaps variantMaps=$vmaps imageMaps=$imaps"
