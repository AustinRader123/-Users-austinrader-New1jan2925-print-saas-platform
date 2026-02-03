#!/usr/bin/env bash
set -euo pipefail

# Fixes the 3 most common causes of “./god.sh isn’t loading”:
#  1) wrong line endings (CRLF) / bad shebang
#  2) not executable / wrong path
#  3) missing bash env / calling from wrong folder

echo "==> 0) Ensure we are in repo root"
pwd
ls -la

echo "==> 1) Verify god.sh exists"
if [ ! -f "./god.sh" ]; then
  echo "ERROR: ./god.sh not found. Showing top-level files:"
  ls -la
  echo "If your script lives in scripts/, run: bash scripts/god.sh"
  exit 1
fi

echo "==> 2) Fix line endings (CRLF->LF) + ensure a valid bash shebang"
# Convert CRLF to LF without needing dos2unix
tmp="$(mktemp)"
sed 's/\r$//' ./god.sh > "$tmp"
mv "$tmp" ./god.sh

# Ensure the first line is a bash shebang
first="$(head -n 1 ./god.sh || true)"
if [[ "$first" != "#!"*bash* ]]; then
  echo "Shebang missing/invalid; inserting #!/usr/bin/env bash"
  tmp="$(mktemp)"
  {
    echo '#!/usr/bin/env bash'
    tail -n +1 ./god.sh
  } > "$tmp"
  mv "$tmp" ./god.sh
fi

echo "==> 3) Make executable"
chmod +x ./god.sh

echo "==> 4) Quick syntax check"
bash -n ./god.sh || { echo "ERROR: bash syntax check failed"; exit 2; }

echo "==> 5) Ensure required tools are present (best-effort)"
command -v gh >/dev/null 2>&1 || echo "WARN: gh not found; CI dispatch will be skipped by god.sh if it requires gh"
command -v docker >/dev/null 2>&1 || echo "WARN: docker not found; compose steps will be skipped by god.sh if it uses docker"

echo "==> 6) Run it in the most compatible way"
# Run via bash (avoids exec issues on some systems)
bash ./god.sh

echo "==> DONE ✅"