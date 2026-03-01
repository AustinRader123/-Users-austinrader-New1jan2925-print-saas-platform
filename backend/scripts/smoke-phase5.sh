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

echo "[phase5] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase5] start backend"
start_cmd "backend-smoke-phase5" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase5.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase5] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
token=$(printf '%s' "$login_resp" | json_field token)
user_id=$(printf '%s' "$login_resp" | json_field userId)
auth_headers=(-H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase5] billing snapshot"
curl --fail --silent --show-error "$BASE_URL/api/billing/snapshot" "${auth_headers[@]}" >/tmp/phase5-billing-snapshot.json

echo "[phase5] gate team stores by downgrading to FREE"
downgrade_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/billing/checkout" "${auth_headers[@]}" -d '{"planCode":"FREE"}' -w $'\n%{http_code}')
downgrade_code=${downgrade_resp##*$'\n'}
if [[ "$downgrade_code" != "201" ]]; then
  echo "[phase5] downgrade checkout failed"
  exit 1
fi

team_resp=$(curl --silent --show-error "$BASE_URL/api/team-stores?storeId=$store_id" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id" -w $'\n%{http_code}')
team_code=${team_resp##*$'\n'}
if [[ "$team_code" != "402" ]]; then
  echo "[phase5] expected team stores to be gated on FREE (got $team_code)"
  exit 1
fi

echo "[phase5] upgrade back to PRO"
upgrade_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/billing/checkout" "${auth_headers[@]}" -d '{"planCode":"PRO"}' -w $'\n%{http_code}')
upgrade_code=${upgrade_resp##*$'\n'}
if [[ "$upgrade_code" != "201" ]]; then
  echo "[phase5] upgrade checkout failed"
  exit 1
fi

echo "[phase5] create + verify custom domain"
domain_host="phase5-$(date +%s).example.test"
domain_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/domains" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"hostname\":\"$domain_host\"}" -w $'\n%{http_code}')
domain_json=${domain_resp%$'\n'*}
domain_code=${domain_resp##*$'\n'}
if [[ "$domain_code" != "201" ]]; then
  echo "[phase5] create domain failed (http=$domain_code body=$domain_json)"
  exit 1
fi
domain_id=$(printf '%s' "$domain_json" | json_field id)
verify_token=$(printf '%s' "$domain_json" | json_field verificationToken)

verify_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/domains/$domain_id/verify" "${auth_headers[@]}" -d "{\"token\":\"$verify_token\",\"manualActivate\":true}" -w $'\n%{http_code}')
verify_code=${verify_resp##*$'\n'}
if [[ "$verify_code" != "200" ]]; then
  echo "[phase5] verify domain failed"
  exit 1
fi

echo "[phase5] host-based public products lookup"
public_resp=$(curl --silent --show-error "$BASE_URL/api/public/products" -H "Host: $domain_host" -w $'\n%{http_code}')
public_code=${public_resp##*$'\n'}
if [[ "$public_code" != "200" ]]; then
  echo "[phase5] host-based public products failed (http=$public_code)"
  exit 1
fi

echo "[phase5] role create + assign"
perms_json=$(curl --fail --silent --show-error "$BASE_URL/api/rbac/permissions" -H "Authorization: Bearer $token" -H "x-tenant-id: $tenant_id")
perm_key=$(printf '%s' "$perms_json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d||'[]');process.stdout.write(a?.[0]?.name||'orders.manage');});")

role_name="phase5-role-$(date +%s)"
role_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/rbac/roles" "${auth_headers[@]}" -d "{\"name\":\"$role_name\",\"description\":\"Phase5 smoke role\",\"permissionKeys\":[\"$perm_key\"]}" -w $'\n%{http_code}')
role_json=${role_resp%$'\n'*}
role_code=${role_resp##*$'\n'}
if [[ "$role_code" != "201" ]]; then
  echo "[phase5] role create failed (http=$role_code body=$role_json)"
  exit 1
fi
role_id=$(printf '%s' "$role_json" | json_field id)

assign_resp=$(curl --silent --show-error -X POST "$BASE_URL/api/rbac/assign" "${auth_headers[@]}" -d "{\"userId\":\"$user_id\",\"roleId\":\"$role_id\"}" -w $'\n%{http_code}')
assign_code=${assign_resp##*$'\n'}
if [[ "$assign_code" != "201" ]]; then
  echo "[phase5] role assignment failed"
  exit 1
fi

echo "[phase5] PASS tenant=$tenant_id store=$store_id domain=$domain_host role=$role_name"
