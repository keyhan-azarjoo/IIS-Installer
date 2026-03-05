[CmdletBinding()]
param(
    [string]$Host = "0.0.0.0",
    [int]$Port = 8090
)

$ErrorActionPreference = "Stop"

$newLauncher = Join-Path $PSScriptRoot "start-server-dashboard.ps1"
if (-not (Test-Path -LiteralPath $newLauncher)) {
    throw "Launcher not found: $newLauncher"
}

Write-Host "Starting Server Installer dashboard (compat mode) on http://$Host`:$Port"
& $newLauncher -Host $Host -Port $Port
