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

contains_path() {
  local json="$1"
  local path="$2"
  printf '%s' "$json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d||'{}');const found=(j.sections||[]).some(s=>(s.items||[]).some(i=>i.to==='${path}')); process.exit(found?0:1);});"
}

echo "[phase7_1] stop + reset + seed"
(cd "$ROOT_DIR" && BACKEND_PORT="$BACKEND_PORT" npm run stop)
(cd "$ROOT_DIR/backend" && npm run db:reset)
(cd "$ROOT_DIR/backend" && npm run db:seed)

echo "[phase7_1] start backend"
start_cmd "backend-smoke-phase7_1" "cd \"$ROOT_DIR/backend\" && BACKEND_PORT=\"$BACKEND_PORT\" PORT=\"$BACKEND_PORT\" BASE_URL=\"$BASE_URL\" npx tsx src/index.ts" "$LOG_DIR/backend-smoke-phase7_1.log" "$PID_DIR/backend.pid"
wait_port_open "$BACKEND_PORT" 30 || { echo "[phase7_1] backend failed to open"; exit 1; }
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

ids_json=$(cd "$ROOT_DIR/backend" && node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const tenant=await prisma.tenant.findFirst({orderBy:{createdAt:'asc'}}); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); console.log(JSON.stringify({tenantId:tenant?.id||'',storeId:store?.id||''})); await prisma.\$disconnect();")
tenant_id=$(printf '%s' "$ids_json" | json_field tenantId)
store_id=$(printf '%s' "$ids_json" | json_field storeId)

login_resp=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
admin_token=$(printf '%s' "$login_resp" | json_field token)
auth_headers=(-H "Authorization: Bearer $admin_token" -H "x-tenant-id: $tenant_id" -H 'Content-Type: application/json')

echo "[phase7_1] verify owner nav includes storefront links"
owner_nav=$(curl --fail --silent --show-error "$BASE_URL/api/navigation/menu" "${auth_headers[@]}")
contains_path "$owner_nav" "/dashboard/onboarding" || { echo "[phase7_1] missing /dashboard/onboarding in owner nav"; exit 1; }
contains_path "$owner_nav" "/dashboard/storefront/theme" || { echo "[phase7_1] missing /dashboard/storefront/theme in owner nav"; exit 1; }

echo "[phase7_1] create restricted staff role without comms.manage"
role_name="phase7_1_staff_$(date +%s)"
role_json=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/rbac/roles" "${auth_headers[@]}" -d "{\"name\":\"$role_name\",\"description\":\"Phase 7.1 restricted\",\"permissionKeys\":[\"onboarding.manage\",\"storefront.theme.manage\",\"documents.view\",\"domains.manage\"]}")
role_id=$(printf '%s' "$role_json" | json_field id)

staff_email="phase71+$(date +%s)@example.test"
staff_pass="StaffPass123!"
staff_reg=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/register" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$staff_email\",\"password\":\"$staff_pass\",\"name\":\"Phase 7.1 Staff\"}")
staff_user_id=$(printf '%s' "$staff_reg" | json_field userId)

curl --fail --silent --show-error -X POST "$BASE_URL/api/rbac/assign" "${auth_headers[@]}" -d "{\"userId\":\"$staff_user_id\",\"roleId\":\"$role_id\"}" >/dev/null

staff_login=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -H "x-tenant-id: $tenant_id" -d "{\"email\":\"$staff_email\",\"password\":\"$staff_pass\"}")
staff_token=$(printf '%s' "$staff_login" | json_field token)
staff_nav=$(curl --fail --silent --show-error "$BASE_URL/api/navigation/menu" -H "Authorization: Bearer $staff_token" -H "x-tenant-id: $tenant_id")
if contains_path "$staff_nav" "/dashboard/communications"; then
  echo "[phase7_1] communications section should be hidden for restricted role"
  exit 1
fi

echo "[phase7_1] verify next-steps banner logic state"
curl --fail --silent --show-error -X PUT "$BASE_URL/api/onboarding" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\",\"step\":2,\"completed\":false,\"data\":{\"business\":{\"name\":\"Incomplete\"}}}" >/dev/null

next_steps=$(curl --fail --silent --show-error "$BASE_URL/api/onboarding/next-steps?storeId=$store_id" "${auth_headers[@]}")
onboarding_incomplete=$(printf '%s' "$next_steps" | json_field onboardingIncomplete)
if [[ "$onboarding_incomplete" != "true" ]]; then
  echo "[phase7_1] expected onboardingIncomplete=true"
  exit 1
fi

curl --fail --silent --show-error -X POST "$BASE_URL/api/onboarding/complete" "${auth_headers[@]}" -d "{\"storeId\":\"$store_id\"}" >/dev/null
next_steps_done=$(curl --fail --silent --show-error "$BASE_URL/api/onboarding/next-steps?storeId=$store_id" "${auth_headers[@]}")
onboarding_incomplete_done=$(printf '%s' "$next_steps_done" | json_field onboardingIncomplete)
if [[ "$onboarding_incomplete_done" != "false" ]]; then
  echo "[phase7_1] expected onboardingIncomplete=false after completion"
  exit 1
fi

echo "[phase7_1] PASS tenant=$tenant_id store=$store_id role=$role_name"
