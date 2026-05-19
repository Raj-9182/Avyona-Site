# Copy local Backend/uploads to the Railway API container (fixes 404 on /uploads/*).
# Prereqs: railway link (Avyona Production), API service deployed.
#
#   cd Backend
#   powershell -ExecutionPolicy Bypass -File scripts/upload-railway-uploads.ps1

param(
  [string]$ServiceName = "api"
)

$ErrorActionPreference = "Stop"
$railway = Join-Path $env:APPDATA "npm\railway.cmd"
$backendRoot = Split-Path $PSScriptRoot -Parent
$uploadsDir = Join-Path $backendRoot "uploads"

if (-not (Test-Path $railway)) {
  throw "Railway CLI not found. Install: npm install -g @railway/cli"
}
if (-not (Test-Path $uploadsDir)) {
  throw "Missing folder: $uploadsDir"
}

$imageCount = (Get-ChildItem $uploadsDir -Recurse -File -Include *.jpg,*.jpeg,*.png,*.webp,*.gif | Measure-Object).Count
if ($imageCount -lt 1) {
  throw "No images in $uploadsDir"
}

Write-Host "Uploading $imageCount image(s) to Railway service '$ServiceName' at /app/Backend/uploads ..."
Write-Host "This may take a few minutes."

$tarCmd = Get-Command tar -ErrorAction SilentlyContinue
if (-not $tarCmd) {
  throw "tar not found. Install Git for Windows and ensure tar is on PATH."
}

$remoteCmd = 'mkdir -p /app/Backend/uploads; cd /app/Backend/uploads; tar -xzf -'

Push-Location $uploadsDir
try {
  tar -czf - . | & $railway ssh --service $ServiceName -- sh -c $remoteCmd
}
finally {
  Pop-Location
}

Write-Host "Done. Test an image URL under https://api-production-c9f5f.up.railway.app/uploads/"
