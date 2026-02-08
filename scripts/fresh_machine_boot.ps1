Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
  Write-Output ""
  Write-Output "==> $msg"
}

function Upsert-EnvLine([string]$path, [string]$key, [string]$value) {
  $quoted = '"' + ($value -replace '"', '\"') + '"'
  $line = "$key=$quoted"
  $rows = @()
  if (Test-Path $path) { $rows = Get-Content $path }
  $found = $false
  $out = foreach ($r in $rows) {
    if ($r -match ("^\s*" + [regex]::Escape($key) + "\s*=")) { $found = $true; $line } else { $r }
  }
  if (-not $found) { $out += $line }
  Set-Content -Path $path -Value $out -Encoding utf8
}

function Wait-HttpOk([string]$url, [int]$timeoutSec = 90) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) { return $resp }
    } catch {}
    Start-Sleep -Seconds 2
  }
  throw "Timed out waiting for $url"
}

Write-Step "Creating fresh clone workspace"
$root = Join-Path $env:TEMP "cotana-fresh-boot"
if (Test-Path $root) { Remove-Item -Recurse -Force $root }
New-Item -ItemType Directory -Path $root | Out-Null

Write-Step "Cloning repo"
git clone "https://github.com/usercrypto000/cotana.git" $root | Out-Null
Set-Location $root

Write-Step "Preflight: ensuring localhost:3000 is free"
try {
  $inUse = Test-NetConnection -ComputerName "127.0.0.1" -Port 3000 -WarningAction SilentlyContinue
  if ($inUse.TcpTestSucceeded) {
    throw "Port 3000 is already in use; stop the process using it, then re-run this script."
  }
} catch {
  throw
}

Write-Step "Preflight: checking Docker engine"
try {
  docker version | Out-Null
} catch {
  throw "Docker is not available or not running. Start Docker Desktop (or your Docker engine) and re-run."
}

Write-Step "Preparing .env from .env.example"
Copy-Item -Force ".env.example" ".env"

# Minimal public RPCs for verification (avoids needing Alchemy keys).
Upsert-EnvLine ".env" "RPC_URL_ETH" "https://cloudflare-eth.com"
Upsert-EnvLine ".env" "RPC_URL_BASE" "https://mainnet.base.org"
Upsert-EnvLine ".env" "EXPLOIT_TRACKER_CHAINS" "1,8453"

# Ensure auth contract has real values (placeholders will fail auth paths later).
$apiKey = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
$jwtSecret = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Upsert-EnvLine ".env" "EXPLOIT_DEFAULT_API_KEY" $apiKey
Upsert-EnvLine ".env" "EXPLOIT_JWT_SECRET" $jwtSecret

Write-Step "Starting postgres + redis via docker compose"
docker compose up -d postgres redis | Out-Null

Write-Step "Installing dependencies"
npm ci | Out-Null

Write-Step "Generating Prisma client"
npx prisma generate | Out-Null

Write-Step "Running prisma migrations"
try {
  npx prisma migrate deploy | Out-Null
} catch {
  Write-Host "Prisma migrate failed; printing docker compose ps + postgres logs for debugging."
  docker compose ps
  docker compose logs --tail 200 postgres
  throw
}

Write-Step "Starting worker + ws + dev server"
$logsDir = Join-Path $root ".fresh-boot-logs"
New-Item -ItemType Directory -Path $logsDir | Out-Null

$pWorker = Start-Process -PassThru -FilePath "npm" -ArgumentList @("run","tracker:worker") `
  -RedirectStandardOutput (Join-Path $logsDir "worker.out.log") -RedirectStandardError (Join-Path $logsDir "worker.err.log") -NoNewWindow
$pWs = Start-Process -PassThru -FilePath "npm" -ArgumentList @("run","tracker:ws") `
  -RedirectStandardOutput (Join-Path $logsDir "ws.out.log") -RedirectStandardError (Join-Path $logsDir "ws.err.log") -NoNewWindow
$pWeb = Start-Process -PassThru -FilePath "npm" -ArgumentList @("run","dev") `
  -RedirectStandardOutput (Join-Path $logsDir "web.out.log") -RedirectStandardError (Join-Path $logsDir "web.err.log") -NoNewWindow

Write-Step "Verifying public APIs and UI"
$statusResp = Wait-HttpOk "http://localhost:3000/api/public/status" 120
try {
  $statusJson = $statusResp.Content | ConvertFrom-Json
} catch {
  throw "status endpoint did not return valid JSON: http://localhost:3000/api/public/status"
}
if (-not $statusJson -or $statusJson.ok -ne $true) {
  throw "status endpoint did not look healthy: http://localhost:3000/api/public/status"
}
Wait-HttpOk "http://localhost:3000/api/public/incidents/live" 120 | Out-Null
Wait-HttpOk "http://localhost:3000/incidents" 120 | Out-Null

Write-Step "PASS: fresh-machine boot verification succeeded"
Write-Host "Logs: $logsDir"

Write-Step "Stopping processes"
foreach ($p in @($pWeb, $pWs, $pWorker)) {
  try { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force } } catch {}
}

Write-Step "Stopping docker services"
docker compose down | Out-Null
