$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pidDir = Join-Path $root 'artifacts/pids'
$backendPort = if ($env:BACKEND_PORT) { [int]$env:BACKEND_PORT } else { 3100 }
$frontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 3000 }
$legacyPorts = @(3000, 3102, 3103, 3104)

function Stop-PidFile($path) {
  if (!(Test-Path $path)) { return }
  $pidText = Get-Content $path -ErrorAction SilentlyContinue | Select-Object -First 1
  Remove-Item $path -ErrorAction SilentlyContinue
  if ([string]::IsNullOrWhiteSpace($pidText)) { return }
  try { Stop-Process -Id ([int]$pidText) -Force -ErrorAction SilentlyContinue } catch {}
}

function Stop-Port($port) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
      try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
    }
  } catch {}
}

New-Item -ItemType Directory -Force -Path $pidDir | Out-Null
Stop-PidFile (Join-Path $pidDir 'backend.pid')
Stop-PidFile (Join-Path $pidDir 'frontend.pid')
Stop-PidFile (Join-Path $pidDir 'mock.pid')
Stop-PidFile (Join-Path $pidDir 'supplier-scheduler.pid')
Stop-Port $backendPort
Stop-Port $frontendPort
foreach ($p in $legacyPorts) { Stop-Port $p }
Write-Host "[stop] OK backend=$backendPort frontend=$frontendPort"
