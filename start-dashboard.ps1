[CmdletBinding()]
param(
    [string]$BindHost = "auto",
    [int]$Port = 8090,
    [switch]$NoExit,
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$bootstrapScript = Join-Path $repoRoot "dashboard\start-server-dashboard-bootstrap.ps1"

if (-not (Test-Path -LiteralPath $bootstrapScript)) {
    throw "Bootstrap script not found: $bootstrapScript"
}

$env:SERVER_INSTALLER_LOCAL_ROOT = $repoRoot
$env:DASHBOARD_HTTPS = "1"

function Test-DashboardUrl([string]$Url) {
    Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public static class ServerInstallerTlsBypass {
    public static bool Ignore(
        object sender,
        X509Certificate certificate,
        X509Chain chain,
        System.Net.Security.SslPolicyErrors sslPolicyErrors) {
        return true;
    }
}
"@ -ErrorAction SilentlyContinue

    $prevCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { param($sender, $cert, $chain, $errors) return [ServerInstallerTlsBypass]::Ignore($sender, $cert, $chain, $errors) }
    try {
        $request = [System.Net.WebRequest]::Create($Url)
        $request.Method = "GET"
        $request.Timeout = 5000
        $response = $request.GetResponse()
        try {
            return [int]$response.StatusCode
        }
        finally {
            $response.Close()
        }
    }
    catch {
        return $null
    }
    finally {
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $prevCallback
    }
}

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

    $displayHost = if ([string]::IsNullOrWhiteSpace($BindHost) -or $BindHost -in @("auto", "0.0.0.0")) { "127.0.0.1" } else { $BindHost }
    $dashboardUrl = "https://$displayHost`:$Port/"
    $statusCode = Test-DashboardUrl -Url $dashboardUrl

    if ($statusCode) {
        Write-Host ""
        Write-Host "Dashboard is responding at: $dashboardUrl" -ForegroundColor Green
        Write-Host "HTTP status: $statusCode"
        if ($OpenBrowser) {
            Start-Process $dashboardUrl | Out-Null
        }
    } else {
        Write-Host ""
        Write-Warning "Dashboard launcher finished, but the URL did not respond immediately: $dashboardUrl"
        Write-Host "Check: C:\ProgramData\Server-Installer\logs\server-installer-dashboard.log"
    }
}
finally {
    Pop-Location
    if ($NoExit) {
        Read-Host "Press Enter to close"
    }
}
