param(
  [int]$ApiPort = 9621,
  [int]$WebPort = 5173
)

$ErrorActionPreference = "Continue"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ApiPidFile = Join-Path $RepoRoot ".api_server.pid"
$WebPidFile = Join-Path $RepoRoot ".webui.pid"

function Write-Step($Message) { Write-Host "`n>>> $Message" -ForegroundColor Cyan }
function Write-Ok($Message) { Write-Host "OK  $Message" -ForegroundColor Green }
function Write-Warn($Message) { Write-Host "WARN $Message" -ForegroundColor Yellow }

function Stop-ByPidFile($Path, $Name) {
  if (-not (Test-Path $Path)) { return $false }
  $pidValue = (Get-Content $Path -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (-not $pidValue) {
    Remove-Item $Path -Force -ErrorAction SilentlyContinue
    return $false
  }
  $proc = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Step "Stopping $Name (PID $pidValue)"
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Write-Ok "$Name stopped"
  } else {
    Write-Warn "$Name PID file existed, but process was not running"
  }
  Remove-Item $Path -Force -ErrorAction SilentlyContinue
  return $true
}

function Stop-ByPort($Port, $Name) {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Warn "$Name is not listening on port $Port"
    return
  }
  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pidValue in $pids) {
    $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Step "Stopping $Name by port $Port (PID $pidValue)"
      Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
      Write-Ok "$Name stopped"
    }
  }
}

Set-Location $RepoRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Stop SpaceLabOS services" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (-not (Stop-ByPidFile $ApiPidFile "LightRAG API")) {
  Stop-ByPort $ApiPort "LightRAG API"
}

if (-not (Stop-ByPidFile $WebPidFile "WebUI")) {
  Stop-ByPort $WebPort "WebUI"
}

Write-Host "`nAll requested services have been stopped." -ForegroundColor Green
