[CmdletBinding()]
param(
    [string]$Host = "auto",
    [int]$Port = 8090,
    [switch]$Http
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$bootstrapScript = Join-Path $repoRoot "dashboard\start-server-dashboard-bootstrap.ps1"

if (-not (Test-Path -LiteralPath $bootstrapScript)) {
    throw "Bootstrap script not found: $bootstrapScript"
}

$env:SERVER_INSTALLER_LOCAL_ROOT = $repoRoot
if ($Http) {
    Remove-Item Env:\DASHBOARD_HTTPS -ErrorAction SilentlyContinue
    Remove-Item Env:\DASHBOARD_CERT -ErrorAction SilentlyContinue
    Remove-Item Env:\DASHBOARD_KEY -ErrorAction SilentlyContinue
}

$argsList = @()
if ($Host) {
    $argsList += @("--host", $Host)
}
if ($Port) {
    $argsList += @("--port", "$Port")
}

Write-Host "Using local repo: $repoRoot"
Write-Host "Starting dashboard launcher..."

Push-Location $repoRoot
try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $bootstrapScript @argsList
}
finally {
    Pop-Location
}
