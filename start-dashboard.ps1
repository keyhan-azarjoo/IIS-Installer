[CmdletBinding()]
param(
    [string]$BindHost = "auto",
    [int]$Port = 8090
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$bootstrapScript = Join-Path $repoRoot "dashboard\start-server-dashboard-bootstrap.ps1"

if (-not (Test-Path -LiteralPath $bootstrapScript)) {
    throw "Bootstrap script not found: $bootstrapScript"
}

$env:SERVER_INSTALLER_LOCAL_ROOT = $repoRoot
$env:DASHBOARD_HTTPS = "1"

$argsList = @()
if ($BindHost) {
    $argsList += @("--host", $BindHost)
}
if ($Port) {
    $argsList += @("--port", "$Port")
}

Write-Host "Using local repo: $repoRoot"
Write-Host "Starting dashboard launcher..."
Write-Host "Mode: HTTPS only"

Push-Location $repoRoot
try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $bootstrapScript @argsList
}
finally {
    Pop-Location
}
