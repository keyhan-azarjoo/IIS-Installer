$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-CommandPath([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$root = Join-Path $env:TEMP "server-installer-bootstrap"
New-Item -ItemType Directory -Force -Path $root | Out-Null

$repo = "https://raw.githubusercontent.com/keyhan-azarjoo/Server-Installer/main"
$dashboard = Join-Path $root "start-server-dashboard.py"

Write-Host "[INFO] Downloading dashboard launcher..."
Invoke-WebRequest -Uri "$repo/dashboard/start-server-dashboard.py" -OutFile $dashboard

$python = Get-CommandPath "python"
if (-not $python) { $python = Get-CommandPath "py" }

if (-not $python) {
  Write-Host "[INFO] Python not found. Bootstrapping embeddable Python..."
  $pyVer = "3.14.2"
  $pyZip = Join-Path $root "python-embed.zip"
  $pyDir = Join-Path $root "python"
  $pyUrl = "https://www.python.org/ftp/python/$pyVer/python-$pyVer-embeddable-amd64.zip"
  Invoke-WebRequest -Uri $pyUrl -OutFile $pyZip
  if (Test-Path $pyDir) { Remove-Item -Recurse -Force $pyDir }
  New-Item -ItemType Directory -Force -Path $pyDir | Out-Null
  Expand-Archive -Path $pyZip -DestinationPath $pyDir -Force
  $python = Join-Path $pyDir "python.exe"
}

Write-Host "[INFO] Starting dashboard..."
& $python $dashboard
