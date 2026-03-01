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

echo "[phase3_1] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase3_1] verify admin suppliers route discoverability in frontend route map"
if ! grep -q 'path="admin/suppliers"' "$ROOT_DIR/frontend/src/App.tsx"; then
  echo "[phase3_1] missing /app/admin/suppliers route"
  exit 1
fi

echo "[phase3_1] start backend"
start_cmd "backend-smoke-phase3_1" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase3_1.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase3_1] backend failed to open :$BACKEND_PORT"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)

if [[ -z "$tenant_id" || -z "$store_id" ]]; then
  echo "[phase3_1] missing tenant/store seed data"
  exit 1
fi

echo "[phase3_1] login admin"
login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -H "x-tenant-id: $tenant_id" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

token=$(printf '%s' "$login_resp" | json_field token)
if [[ -z "$token" ]]; then
  echo "[phase3_1] login failed"
  exit 1
fi

auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase3_1] ensure mock supplier connection with scheduling enabled"
conn_resp=$(curl --silent --show-error "$BASE_URL/api/suppliers/connections?storeId=$store_id" "${auth_headers[@]}" -w $'\n%{http_code}')
conn_json=${conn_resp%$'\n'*}
conn_code=${conn_resp##*$'\n'}
if [[ "$conn_code" != "200" ]]; then
  echo "[phase3_1] list connections failed (http=$conn_code body=$conn_json)"
  exit 1
fi

connection_id=$(printf '%s' "$conn_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'[]');const c=(j||[]).find((x)=>x.supplier==='MOCK');process.stdout.write(c?.id||'');});")
if [[ -z "$connection_id" ]]; then
  create_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/suppliers/connections" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"supplier\":\"MOCK\",\"name\":\"Phase3.1 Mock Supplier\",\"authType\":\"MOCK\",\"syncEnabled\":true,\"syncIntervalMinutes\":1,\"credentials\":{\"mode\":\"mock\"}}" -w $'\n%{http_code}')
  create_json=${create_resp%$'\n'*}
  create_code=${create_resp##*$'\n'}
  if [[ "$create_code" != "201" ]]; then
    echo "[phase3_1] create connection failed (http=$create_code body=$create_json)"
    exit 1
  fi
  connection_id=$(printf '%s' "$create_json" | json_field id)
else
  patch_resp=$(curl --silent --show-error -X PATCH "$BASE_URL/api/suppliers/connections/$connection_id" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"syncEnabled\":true,\"syncIntervalMinutes\":1,\"syncNextAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" -w $'\n%{http_code}')
  patch_code=${patch_resp##*$'\n'}
  if [[ "$patch_code" != "200" ]]; then
    echo "[phase3_1] patch connection scheduling failed"
    exit 1
  fi
fi

before_runs=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const count=await prisma.supplierSyncRun.count({where:{supplierConnectionId:'${connection_id}'}}); console.log(count); await prisma.\$disconnect();")

echo "[phase3_1] run scheduler tick once"
attempt=1
max_attempts=8
after_runs="$before_runs"
while [[ "$attempt" -le "$max_attempts" ]]; do
  (cd "$ROOT_DIR/backend" && SUPPLIER_SCHEDULER_IGNORE_LOCK=true npm run supplier:scheduler:once >/tmp/supplier_scheduler_once.out)
  scheduler_json=$(cat /tmp/supplier_scheduler_once.out | tail -n 1)

  after_runs=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const count=await prisma.supplierSyncRun.count({where:{supplierConnectionId:'${connection_id}'}}); console.log(count); await prisma.\$disconnect();")
  if [[ "$after_runs" -gt "$before_runs" ]]; then
    break
  fi

  scheduler_reason=$(printf '%s' "$scheduler_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d||'{}');process.stdout.write(String(j.reason||''));}catch{process.stdout.write('');}})")
  scheduler_scheduled=$(printf '%s' "$scheduler_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d||'{}');process.stdout.write(String(Number(j.scheduled||0)));}catch{process.stdout.write('0');}})")

  if [[ "$scheduler_reason" == "lock-not-acquired" ]]; then
    sleep 5
    attempt=$((attempt+1))
    continue
  fi

  if [[ "$scheduler_scheduled" -eq 0 ]]; then
    patch_resp=$(curl --silent --show-error -X PATCH "$BASE_URL/api/suppliers/connections/$connection_id" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"syncEnabled\":true,\"syncIntervalMinutes\":1,\"syncNextAt\":\"1970-01-01T00:00:00Z\"}" -w $'\n%{http_code}')
    patch_code=${patch_resp##*$'\n'}
    if [[ "$patch_code" != "200" ]]; then
      echo "[phase3_1] patch connection scheduling failed during retry"
      exit 1
    fi
  fi

  sleep 1
  attempt=$((attempt+1))
done

if [[ "$after_runs" -le "$before_runs" ]]; then
  connection_state=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const row=await prisma.supplierConnection.findUnique({where:{id:'${connection_id}'}}); console.log(JSON.stringify(row||{})); await prisma.\$disconnect();")
  echo "[phase3_1] scheduler tick did not enqueue/create sync run (before=$before_runs after=$after_runs scheduler=$scheduler_json connection=$connection_state)"
  exit 1
fi

echo "[phase3_1] run inline mock sync"
sync_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/suppliers/connections/$connection_id/sync" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"queue\":false,\"includeImages\":true}" -w $'\n%{http_code}')
sync_json=${sync_resp%$'\n'*}
sync_code=${sync_resp##*$'\n'}
if [[ "$sync_code" != "200" ]]; then
  echo "[phase3_1] sync failed (http=$sync_code body=$sync_json)"
  exit 1
fi
run_id=$(printf '%s' "$sync_json" | json_field runId)
if [[ -z "$run_id" ]]; then
  echo "[phase3_1] missing run id from sync"
  exit 1
fi

echo "[phase3_1] verify run log downloadable"
log_resp=$(curl --silent --show-error -D - -o /tmp/supplier_run_${run_id}.log "$BASE_URL/api/suppliers/sync-runs/$run_id/log?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
if ! printf '%s' "$log_resp" | grep -q '200'; then
  echo "[phase3_1] run log download failed"
  exit 1
fi
if [[ ! -s "/tmp/supplier_run_${run_id}.log" ]]; then
  echo "[phase3_1] downloaded run log is empty"
  exit 1
fi

echo "[phase3_1] verify CSV export"
csv_path="/tmp/supplier_export_${connection_id}.csv"
curl --fail --silent --show-error "$BASE_URL/api/suppliers/export/catalog.csv?connectionId=$connection_id&storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -o "$csv_path"
if ! head -n 1 "$csv_path" | grep -q 'productId,productName,externalProductId,variantId,color,size,sku,cost,supplierInventoryQty,imageCount,lastSyncedAt'; then
  echo "[phase3_1] CSV header mismatch"
  exit 1
fi

csv_check=$(CSV_PATH="$csv_path" node --input-type=module -e "import fs from 'node:fs'; const file=process.env.CSV_PATH||''; const txt=(fs.readFileSync(file,'utf8')||'').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trimEnd(); const lines=txt.length?txt.split('\n'):[]; const header=(lines[0]||'').split(','); const required=['productId','productName','externalProductId','variantId','sku']; const missing=required.filter((k)=>!header.includes(k)); if (lines.length<2) { console.log(JSON.stringify({ok:false,error:'no_data_rows',rows:lines.length})); process.exit(0);} if (missing.length){ console.log(JSON.stringify({ok:false,error:'missing_columns',missing})); process.exit(0);} const idx=Object.fromEntries(header.map((h,i)=>[h,i])); const data=lines.slice(1).filter((l)=>l.trim().length>0).map((l)=>l.split(',')); const bad=data.find((r)=>!String(r[idx.productId]||'').trim()||!String(r[idx.variantId]||'').trim()||!String(r[idx.sku]||'').trim()); if (bad){ console.log(JSON.stringify({ok:false,error:'empty_required_fields'})); process.exit(0);} const variants=data.map((r)=>String(r[idx.variantId]||'')); const unique=new Set(variants); if (unique.size!==variants.length){ console.log(JSON.stringify({ok:false,error:'duplicate_variant_rows',rows:variants.length,unique:unique.size})); process.exit(0);} const hasMockSku=data.some((r)=>String(r[idx.sku]||'').startsWith('MOCK-')); if (!hasMockSku){ console.log(JSON.stringify({ok:false,error:'missing_mock_sku'})); process.exit(0);} console.log(JSON.stringify({ok:true,dataRows:data.length}));")

csv_ok=$(printf '%s' "$csv_check" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(j.ok?'1':'0');})")
if [[ "$csv_ok" != "1" ]]; then
  echo "[phase3_1] CSV invariant check failed (file=$csv_path check=$csv_check)"
  exit 1
fi

rows=$(printf '%s' "$csv_check" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');process.stdout.write(String(j.dataRows||0));})")

echo "[phase3_1] PASS connection=$connection_id run=$run_id csvPath=$csv_path csvRows=$rows"
