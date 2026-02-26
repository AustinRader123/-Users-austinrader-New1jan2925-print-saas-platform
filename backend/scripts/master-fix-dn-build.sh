#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/austinrader/feb1/backend"
SRC="$ROOT/src"
ROUTES="$SRC/routes"
APP="$SRC/app.ts"
INV_REPO="$SRC/modules/dn/repositories/inventory.repository.ts"
SYNC_PROC="$SRC/modules/dn/syncProcessor.ts"

ts() { date +"%Y%m%d_%H%M%S"; }
bk() { [[ -f "$1" ]] && cp -p "$1" "$1.bak.$(ts)" || true; }
say() { printf "\n\033[1m%s\033[0m\n" "$*"; }

say "==> cd $ROOT"
cd "$ROOT"

say "==> Ensure route files exist (dn_connections, dn_sync, dn_explore)"
mkdir -p "$ROUTES"

create_route_if_missing() {
  local path="$1"
  local content="$2"
  if [[ ! -f "$path" ]]; then
    say "  + Creating $(basename "$path")"
    cat > "$path" <<<"$content"
  else
    say "  = Exists: $(basename "$path")"
  fi
}

create_route_if_missing "$ROUTES/dn_connections.ts" \
"import { Router } from \"express\";

const router = Router();

router.get(\"/dn/connections/health\", (_req, res) => res.json({ ok: true }));

export default router;
"

create_route_if_missing "$ROUTES/dn_sync.ts" \
"import { Router } from \"express\";

const router = Router();

router.post(\"/dn/sync/bootstrap\", (_req, res) => res.json({ ok: true }));

export default router;
"

create_route_if_missing "$ROUTES/dn_explore.ts" \
"import { Router } from \"express\";

const router = Router();

router.get(\"/dn/explore/health\", (_req, res) => res.json({ ok: true }));

export default router;
"

say "==> Patch src/app.ts (remove .js extensions for DN route imports; ensure app.use mounts)"
if [[ ! -f "$APP" ]]; then
  echo "ERROR: $APP not found" >&2
  exit 1
fi

bk "$APP"

python3 - <<PY
import pathlib, re
p = pathlib.Path("$APP")
s = p.read_text()
s = re.sub(r"from\\s+[\"']\\./routes/dn_connections\\.js[\"']", 'from "./routes/dn_connections"', s)
s = re.sub(r"from\\s+[\"']\\./routes/dn_sync\\.js[\"']", 'from "./routes/dn_sync"', s)
s = re.sub(r"from\\s+[\"']\\./routes/dn_explore\\.js[\"']", 'from "./routes/dn_explore"', s)
p.write_text(s)
PY

ensure_import() {
  local symbol="$1"
  local from="$2"
  if ! grep -qE "import\s+$symbol\s+from\s+\"$from\"" "$APP"; then
    say "  + Adding import: $symbol from $from"
    python3 - <<PY
import re, pathlib
p = pathlib.Path("$APP")
s = p.read_text()
imp = 'import ${symbol} from "${from}";\n'
if imp in s:
    raise SystemExit(0)
# find end of initial import section
m = re.search(r'^(?:import .*?\n)+\n', s, flags=re.M)
if m:
    i = m.end()
    s = s[:i] + imp + s[i:]
else:
    s = imp + s
p.write_text(s)
PY
  else
    say "  = Import present: $symbol"
  fi
}

ensure_import "dnConnections" "./routes/dn_connections"
ensure_import "dnSync" "./routes/dn_sync"
ensure_import "dnExplore" "./routes/dn_explore"

python3 - <<PY
import pathlib, re
p = pathlib.Path("$APP")
s = p.read_text()

if all(k in s for k in ["app.use(dnConnections)", "app.use(dnSync)", "app.use(dnExplore)"]):
    print("  = app.use mounts already present")
    raise SystemExit(0)

m = re.search(r'^\s*const\s+app\s*=\s*express\(\)\s*;?\s*$', s, flags=re.M)
if not m:
    print("  ! Could not find `const app = express()`; add app.use mounts manually.")
    raise SystemExit(0)

insert = "\n// DN routes\napp.use(dnConnections);\napp.use(dnSync);\napp.use(dnExplore);\n"
pos = m.end()
p.write_text(s[:pos] + insert + s[pos:])
print("  + Inserted app.use mounts after app initialization")
PY

say "==> Patch inventory.repository.ts typing issues (best-effort)"
if [[ -f "$INV_REPO" ]]; then
  bk "$INV_REPO"

  if ! grep -q "type VariantMapRow" "$INV_REPO"; then
    say "  + Adding VariantMapRow type"
    python3 - <<PY
import pathlib, re
p = pathlib.Path("$INV_REPO")
s = p.read_text()
t = "\n// Added by master-fix script\n" \
    "type VariantMapRow = { id: string; dnVariantId: string; productVariantId: string };\n"
m = re.search(r'^(?:import .*?\n)+\n', s, flags=re.M)
if m:
    i = m.end()
    s = s[:i] + t + s[i:]
else:
    s = t + s
p.write_text(s)
PY
  else
    say "  = VariantMapRow type already present"
  fi

  if grep -q "ex\?\.message" "$INV_REPO"; then
    say "  + Hardening catch(ex) -> catch(ex: unknown) with safe msg extraction"
    python3 - <<PY
import pathlib, re
p = pathlib.Path("$INV_REPO")
s = p.read_text()
s = re.sub(r'catch\s*\(\s*ex\s*\)', 'catch (ex: unknown)', s)
if "ex?.message" in s:
    s = s.replace(
        "ex?.message",
        '(ex instanceof Error ? ex.message : (typeof ex === "string" ? ex : JSON.stringify(ex)))'
    )
p.write_text(s)
PY
  else
    say "  = No ex?.message pattern found; skipping catch hardening"
  fi

  say "  = NOTE: If existingMap still errors about missing id, ensure your findFirst/select includes id."
else
  say "  = inventory.repository.ts not found; skipping"
fi

say "==> Quick sanity: show missing imports in syncProcessor.ts (no auto-rewrite, just locate)"
if [[ -f "$SYNC_PROC" ]]; then
  say "  = syncProcessor.ts exists: $SYNC_PROC"
  say "  = If tsc still complains about import paths, open it and adjust relative imports:"
  echo "    code -g \"$SYNC_PROC\""
else
  say "  ! syncProcessor.ts not found at: $SYNC_PROC"
fi

say "==> Run TypeScript check"
npx tsc -p tsconfig.json --noEmit

say "✅ tsc passed. Next: re-run deploy dry-run"
echo "DEPLOY_MODE=noop ../deploy.sh"
