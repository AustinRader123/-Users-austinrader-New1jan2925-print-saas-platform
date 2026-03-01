$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backendPort = if ($env:BACKEND_PORT) { [int]$env:BACKEND_PORT } else { 3100 }
$frontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 3000 }
$baseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:$backendPort" }
$allowBusy = if ($env:DOCTOR_ALLOW_BUSY_PORTS) { $env:DOCTOR_ALLOW_BUSY_PORTS } else { '0' }
$doctorProfile = if ($env:DOCTOR_PROFILE) { $env:DOCTOR_PROFILE } else { 'development' }
$logDir = Join-Path $root 'artifacts/logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$fail = $false
$strictDbMode = ($env:CI -eq 'true' -or $env:REQUIRE_DOCKER -eq '1' -or $env:NODE_ENV -eq 'production')

Write-Host "[doctor] BACKEND_PORT=$backendPort FRONTEND_PORT=$frontendPort BASE_URL=$baseUrl"

if ($allowBusy -ne '1') {
  try {
    if (Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue) {
      Write-Host "[doctor] FAIL backend port in use: $backendPort (run npm run stop)"
      $fail = $true
    }
    if (Get-NetTCPConnection -LocalPort $frontendPort -State Listen -ErrorAction SilentlyContinue) {
      Write-Host "[doctor] FAIL frontend port in use: $frontendPort (run npm run stop)"
      $fail = $true
    }
  } catch {}
}

if (-not $env:DATABASE_URL) {
  if ($strictDbMode) {
    Write-Host '[doctor] FAIL DATABASE_URL missing in CI; set it to postgres service host (postgres).'
    $fail = $true
  } else {
    Write-Host '[doctor] WARN DATABASE_URL not found in shell env (backend/.env may still satisfy runtime).'
  }
} elseif ($strictDbMode -and ($env:DATABASE_URL -match '@localhost:' -or $env:DATABASE_URL -match '@127\.0\.0\.1:')) {
  Write-Host '[doctor] FAIL CI/compose DATABASE_URL must not use localhost. Use postgres service host.'
  $fail = $true
}
if (-not $env:JWT_SECRET) {
  Write-Host '[doctor] WARN JWT_SECRET not found in shell env (backend/.env may still satisfy runtime).'
}

if ($doctorProfile -eq 'production') {
  if (-not $env:CORS_ORIGIN -or $env:CORS_ORIGIN -eq '*') {
    Write-Host '[doctor] FAIL production profile requires explicit CORS_ORIGIN allowlist.'
    $fail = $true
  }
  if ($env:NODE_ENV -and $env:NODE_ENV -ne 'production') {
    Write-Host "[doctor] FAIL DOCTOR_PROFILE=production but NODE_ENV is '$($env:NODE_ENV)'"
    $fail = $true
  }
  if ($env:JWT_SECRET -and $env:JWT_SECRET.Length -lt 32) {
    Write-Host '[doctor] FAIL production profile requires JWT_SECRET length >= 32.'
    $fail = $true
  }
}

$dbLog = Join-Path $logDir 'doctor-db.log'
Push-Location (Join-Path $root 'backend')
try {
  if ($env:DATABASE_URL) {
    $dbUri = [uri]$env:DATABASE_URL
    $dbPort = if ($dbUri.Port -gt 0) { $dbUri.Port } else { 5432 }
    Write-Host ('[doctor] DB_TARGET=' + $dbUri.Host + ':' + $dbPort)
  }
  $out = npm run db:migrate 2>&1 | Tee-Object -FilePath $dbLog
  if ($LASTEXITCODE -ne 0) {
    if ($out -match 'P1001') {
      Write-Host '[doctor] FAIL database unreachable (Prisma P1001).'
    } else {
      Write-Host '[doctor] FAIL database migration check failed. See artifacts/logs/doctor-db.log'
    }
    $fail = $true
  }
} finally {
  Pop-Location
}

if ($fail) {
  Write-Host '[doctor] recent logs'
  Get-ChildItem -Path $logDir -File -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "----- artifacts/logs/$($_.Name) (last 50) -----"
    Get-Content $_.FullName -Tail 50
  }
  exit 1
}

Write-Host '[doctor] OK'
