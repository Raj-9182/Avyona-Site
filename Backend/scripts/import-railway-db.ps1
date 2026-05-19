# Import schema + seed into Railway MySQL for the linked project.
# Usage: railway link  (select Avyona Production)  then run from Backend folder:
#   powershell -ExecutionPolicy Bypass -File scripts/import-railway-db.ps1

$ErrorActionPreference = "Stop"
$railway = Join-Path $env:APPDATA "npm\railway.cmd"
$node = "C:\Program Files\nodejs\node.exe"

if (-not (Test-Path $railway)) {
  throw "Railway CLI not found. Install: npm install -g @railway/cli"
}

$kv = & $railway variable list --service MySQL --kv 2>$null
$publicUrl = ($kv | Where-Object { $_ -match '^MYSQL_PUBLIC_URL=' }) -replace '^MYSQL_PUBLIC_URL=',''
if (-not $publicUrl) {
  throw "MYSQL_PUBLIC_URL not found. Run 'railway link' and ensure MySQL service exists."
}

$uri = [Uri]$publicUrl
$env:DB_HOST = $uri.Host
$env:DB_PORT = $uri.Port
$env:DB_USER = [Uri]::UnescapeDataString($uri.UserInfo.Split(':')[0])
$env:DB_PASSWORD = [Uri]::UnescapeDataString($uri.UserInfo.Split(':')[1])
$env:DB_NAME = $uri.AbsolutePath.TrimStart('/')

Write-Host "Importing schema + seed into database: $env:DB_NAME on $env:DB_HOST ..."
& $node (Join-Path $PSScriptRoot "setup-database.mjs")
Write-Host "Done."
