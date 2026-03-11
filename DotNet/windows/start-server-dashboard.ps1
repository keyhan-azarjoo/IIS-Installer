[CmdletBinding()]
param(
    [string]$BindHost = "auto",
    [int]$Port = 8090
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$launcher = Join-Path $repoRoot "start-dashboard.ps1"
if (-not (Test-Path -LiteralPath $launcher)) {
    throw "HTTPS dashboard launcher not found: $launcher"
}

Write-Host "Starting dashboard in HTTPS-only mode..."
& $launcher -BindHost $BindHost -Port $Port
