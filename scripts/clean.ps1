$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$targets = @(
  'frontend/dist',
  'frontend/build',
  'frontend/.next',
  'frontend/out',
  'frontend/coverage',
  'repo/frontend/dist',
  'repo/frontend/build',
  'repo/frontend/.next',
  'repo/frontend/out',
  'repo/frontend/coverage',
  'frontend/test-results',
  'frontend/playwright-report',
  'artifacts/pids',
  'artifacts/backups',
  'backend/logs'
)

foreach ($rel in $targets) {
  $path = Join-Path $root $rel
  if (Test-Path $path) {
    Remove-Item -Recurse -Force $path
    Write-Host "[clean] removed $rel"
  }
}

$logDir = Join-Path $root 'artifacts/logs'
if (Test-Path $logDir) {
  Get-ChildItem -Path $logDir -Filter *.log -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Get-ChildItem -Path $logDir -Filter *.pid -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Get-ChildItem -Path $logDir -Filter noninteractive-*.log -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Write-Host '[clean] removed artifacts/logs/*.log'
}

$uploadsDir = Join-Path $root 'backend/uploads'
if (Test-Path $uploadsDir) {
  Get-ChildItem -Path $uploadsDir -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.gitkeep' } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host '[clean] removed backend/uploads/*'
}

$keepDirs = @(
  'artifacts/logs',
  'artifacts/pids',
  'artifacts/backups',
  'backend/uploads',
  'backend/logs',
  'frontend/test-results',
  'frontend/playwright-report'
)

foreach ($rel in $keepDirs) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
  }
  $gitkeep = Join-Path $path '.gitkeep'
  if (-not (Test-Path $gitkeep)) {
    New-Item -ItemType File -Force -Path $gitkeep | Out-Null
  }
}

Write-Host '[clean] OK'
