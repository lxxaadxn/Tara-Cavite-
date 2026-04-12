# Remove duplicate repo-root web/ after apps/web/ is in use.
# Stop Vite (npm run web) first, then run:
#   powershell -ExecutionPolicy Bypass -File scripts/cleanup-legacy-web.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$legacy = Join-Path $root "web"
$appsWeb = Join-Path $root "apps\web"

if (-not (Test-Path $appsWeb)) {
  Write-Error "apps/web not found. Do not delete legacy web/."
}
if (-not (Test-Path $legacy)) {
  Write-Host "No legacy web/ folder - nothing to do."
  exit 0
}

Write-Host "Removing $legacy ..."
Remove-Item -LiteralPath $legacy -Recurse -Force
Write-Host "Done."
