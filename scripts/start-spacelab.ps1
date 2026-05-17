param(
  [int]$ApiPort = 9621,
  [int]$WebPort = 5173,
  [switch]$InstallMissing,
  [switch]$SkipWebUI
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$WebRoot = Join-Path $RepoRoot "lightrag_webui"
$LogDir = Join-Path $RepoRoot "logs"
$ApiPidFile = Join-Path $RepoRoot ".api_server.pid"
$WebPidFile = Join-Path $RepoRoot ".webui.pid"

function Write-Step($Message) { Write-Host "`n>>> $Message" -ForegroundColor Cyan }
function Write-Ok($Message) { Write-Host "OK  $Message" -ForegroundColor Green }
function Write-Warn($Message) { Write-Host "WARN $Message" -ForegroundColor Yellow }
function Write-Fail($Message) { Write-Host "FAIL $Message" -ForegroundColor Red }

function Get-CommandPath($Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Test-PortOpen($Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return [bool]$conn
}

function Wait-Http($Url, $Seconds) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
      return $true
    } catch {
      Start-Sleep -Milliseconds 700
    }
  }
  return $false
}

function Assert-Command($Name, $Hint) {
  $path = Get-CommandPath $Name
  if (-not $path) {
    throw "$Name not found. $Hint"
  }
  return $path
}

Set-Location $RepoRoot
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " SpaceLabOS PowerShell startup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Step "Checking Python environment"
$VenvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
if (Test-Path $VenvPython) {
  $Python = $VenvPython
  Write-Ok "Using virtual environment: $Python"
} else {
  $Python = Get-CommandPath "python"
  if (-not $Python) { $Python = Get-CommandPath "py" }
  if (-not $Python) {
    throw "Python not found. Install Python 3.10+ and create .venv with: python -m venv .venv"
  }
  Write-Warn ".venv not found; using system Python: $Python"
}

$PythonVersion = & $Python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ([version]$PythonVersion -lt [version]"3.10") {
  throw "Python $PythonVersion is too old. Python 3.10+ is required."
}
Write-Ok "Python $PythonVersion"

$ImportCheck = & $Python -c "import importlib.util, sys; missing=[m for m in ['lightrag','fastapi','uvicorn'] if importlib.util.find_spec(m) is None]; print(','.join(missing)); sys.exit(1 if missing else 0)" 2>$null
if ($LASTEXITCODE -ne 0) {
  if ($InstallMissing) {
    Write-Step "Installing Python API dependencies"
    & $Python -m pip install -e ".[api]"
    if ($LASTEXITCODE -ne 0) { throw "Python dependency installation failed." }
  } else {
    throw "Missing Python modules: $ImportCheck. Run: .\scripts\start-spacelab.ps1 -InstallMissing"
  }
} else {
  Write-Ok "Python modules are available"
}

if (Test-Path (Join-Path $RepoRoot ".env")) {
  Write-Ok ".env found"
} else {
  Write-Warn ".env not found. The API may start, but LLM/Embedding calls can fail until configuration is added."
}

if (-not $SkipWebUI) {
  Write-Step "Checking WebUI environment"
  Assert-Command "node" "Install Node.js 18+." | Out-Null
  $NodeVersion = (node --version).TrimStart("v")
  if ([version]$NodeVersion.Split("-")[0] -lt [version]"18.0.0") {
    throw "Node.js $NodeVersion is too old. Node.js 18+ is required."
  }
  Write-Ok "Node.js $NodeVersion"

  $PackageRunner = $null
  if (Get-CommandPath "bun") {
    $PackageRunner = "bun"
    Write-Ok "Bun found"
  } elseif (Get-CommandPath "npm") {
    $PackageRunner = "npm"
    Write-Warn "Bun not found; falling back to npm"
  } else {
    throw "Neither Bun nor npm was found. Install Bun or Node.js/npm."
  }

  if (-not (Test-Path (Join-Path $WebRoot "node_modules"))) {
    if ($InstallMissing) {
      Write-Step "Installing WebUI dependencies"
      Push-Location $WebRoot
      try {
        if ($PackageRunner -eq "bun") {
          & bun install --frozen-lockfile
        } else {
          & npm install
        }
        if ($LASTEXITCODE -ne 0) { throw "WebUI dependency installation failed." }
      } finally {
        Pop-Location
      }
    } else {
      throw "WebUI node_modules not found. Run: .\scripts\start-spacelab.ps1 -InstallMissing"
    }
  } else {
    Write-Ok "WebUI dependencies are present"
  }
}

Write-Step "Checking ports"
$env:PORT = "$ApiPort"
$env:VITE_BACKEND_URL = "http://localhost:$ApiPort"
$ApiAlreadyRunning = Test-PortOpen $ApiPort
if ($ApiAlreadyRunning) {
  Write-Warn "Port $ApiPort is already in use; API startup skipped"
} else {
  Write-Step "Starting LightRAG API on port $ApiPort"
  $ApiLog = Join-Path $LogDir "api_server.log"
  $ApiErrLog = Join-Path $LogDir "api_server.err.log"
  $ApiProcess = Start-Process -FilePath $Python -ArgumentList @("-c", "from lightrag.api.lightrag_server import main; main()") -WorkingDirectory $RepoRoot -RedirectStandardOutput $ApiLog -RedirectStandardError $ApiErrLog -PassThru -WindowStyle Hidden
  Set-Content -Path $ApiPidFile -Value $ApiProcess.Id
  Write-Ok "API process started (PID $($ApiProcess.Id))"
}

if (-not $SkipWebUI) {
  $WebAlreadyRunning = Test-PortOpen $WebPort
  if ($WebAlreadyRunning) {
    Write-Warn "Port $WebPort is already in use; WebUI startup skipped"
  } else {
    Write-Step "Starting WebUI on port $WebPort"
    $WebLog = Join-Path $LogDir "webui.log"
    $WebErrLog = Join-Path $LogDir "webui.err.log"
    if (Get-CommandPath "bun") {
      $WebProcess = Start-Process -FilePath "bun" -ArgumentList @("run", "dev", "--", "--host", "0.0.0.0", "--port", "$WebPort") -WorkingDirectory $WebRoot -RedirectStandardOutput $WebLog -RedirectStandardError $WebErrLog -PassThru -WindowStyle Hidden
    } else {
      $Npm = if (Get-CommandPath "npm.cmd") { "npm.cmd" } else { "npm" }
      $WebProcess = Start-Process -FilePath $Npm -ArgumentList @("run", "dev", "--", "--host", "0.0.0.0", "--port", "$WebPort") -WorkingDirectory $WebRoot -RedirectStandardOutput $WebLog -RedirectStandardError $WebErrLog -PassThru -WindowStyle Hidden
    }
    Set-Content -Path $WebPidFile -Value $WebProcess.Id
    Write-Ok "WebUI process started (PID $($WebProcess.Id))"
  }
}

Write-Step "Waiting for services"
if (-not $ApiAlreadyRunning) {
  if (Wait-Http "http://localhost:$ApiPort/health" 20) {
    Write-Ok "API health check passed"
  } else {
    Write-Warn "API health check did not respond yet. Check logs\api_server.log"
  }
}
if ((-not $SkipWebUI) -and (-not $WebAlreadyRunning)) {
  if (Wait-Http "http://localhost:$WebPort/webui/#/spacelab" 20) {
    Write-Ok "WebUI responded"
  } else {
    Write-Warn "WebUI did not respond yet. Check logs\webui.log"
  }
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " Startup complete" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Entry:  http://localhost:$WebPort/webui/#/spacelab"
Write-Host "Screen: http://localhost:$WebPort/webui/#/spacelab/main"
Write-Host "Tablet: http://localhost:$WebPort/webui/#/spacelab/tablet"
Write-Host "API:    http://localhost:$ApiPort/docs"
Write-Host "Stop:   .\scripts\stop-spacelab.ps1"
