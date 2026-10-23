# TriSeal local dev launcher (Windows PowerShell).
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 [-NoApi] [-Build]
param(
  [switch]$NoApi,   # skip the FastAPI backend
  [switch]$Build    # serve a production build instead of the dev server
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required: https://nodejs.org' }
if (-not (Test-Path 'site\node_modules')) {
  Write-Host '> Installing site dependencies...'
  npm --prefix site install
}

$api = $null
if (-not $NoApi) {
  $py = Get-Command python -ErrorAction SilentlyContinue
  if ($py) {
    & python -c "import fastapi, uvicorn" 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Host '> Installing API dependencies...'
      python -m pip install -r requirements.txt uvicorn
    }
    Write-Host '> Starting API on http://localhost:8000 (docs at /docs)'
    $api = Start-Process python -ArgumentList '-m', 'uvicorn', 'api.index:app', '--port', '8000' -PassThru -NoNewWindow
  } else {
    Write-Host '! Python not found - running the site without the API (every tool still works in the browser).'
  }
}

try {
  Start-Process 'http://localhost:5173'
  if ($Build) {
    npm --prefix site run build
    npm --prefix site run preview -- --port 5173 --strictPort
  } else {
    npm --prefix site run dev -- --port 5173 --strictPort
  }
} finally {
  if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id }
}
