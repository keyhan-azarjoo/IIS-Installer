[CmdletBinding()]
param(
    [string]$DashboardUser,
    [string]$DashboardPassword,
    [int]$Port = 8090
)

$ErrorActionPreference = "Stop"

function Read-RequiredValue {
    param(
        [Parameter(Mandatory = $true)][string]$Prompt,
        [switch]$Secure
    )

    if ($Secure) {
        $secureValue = Read-Host -Prompt $Prompt -AsSecureString
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
        try {
            return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        }
    }

    return Read-Host -Prompt $Prompt
}

if ([string]::IsNullOrWhiteSpace($DashboardUser)) {
    $DashboardUser = Read-RequiredValue -Prompt "Enter dashboard username"
}
if ([string]::IsNullOrWhiteSpace($DashboardPassword)) {
    $DashboardPassword = Read-RequiredValue -Prompt "Enter dashboard password" -Secure
}

$installerScript = Join-Path $PSScriptRoot "install-windows-dotnet-host.ps1"
if (-not (Test-Path -LiteralPath $installerScript)) {
    throw "Installer script not found: $installerScript"
}

$sessions = @{}

function Get-FormData {
    param([Parameter(Mandatory = $true)]$Request)

    $body = ""
    $reader = New-Object IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
    try {
        $body = $reader.ReadToEnd()
    }
    finally {
        $reader.Close()
    }

    $result = @{}
    foreach ($pair in ($body -split "&")) {
        if ([string]::IsNullOrWhiteSpace($pair)) {
            continue
        }
        $parts = $pair -split "=", 2
        $key = [uri]::UnescapeDataString(($parts[0] -replace "\+", " "))
        $value = if ($parts.Count -gt 1) { [uri]::UnescapeDataString(($parts[1] -replace "\+", " ")) } else { "" }
        $result[$key] = $value
    }
    return $result
}

function Write-Response {
    param(
        [Parameter(Mandatory = $true)]$Context,
        [Parameter(Mandatory = $true)][string]$Content,
        [string]$ContentType = "text/html; charset=utf-8",
        [int]$StatusCode = 200
    )

    $bytes = [Text.Encoding]::UTF8.GetBytes($Content)
    $Context.Response.StatusCode = $StatusCode
    $Context.Response.ContentType = $ContentType
    $Context.Response.ContentLength64 = $bytes.Length
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Context.Response.OutputStream.Close()
}

function Get-SessionId {
    param([Parameter(Mandatory = $true)]$Request)

    $cookie = $Request.Headers["Cookie"]
    if ([string]::IsNullOrWhiteSpace($cookie)) {
        return $null
    }

    foreach ($segment in ($cookie -split ";")) {
        $trimmed = $segment.Trim()
        if ($trimmed -like "sid=*") {
            return $trimmed.Substring(4)
        }
    }
    return $null
}

function Test-Authenticated {
    param([Parameter(Mandatory = $true)]$Request)

    $sid = Get-SessionId -Request $Request
    if ([string]::IsNullOrWhiteSpace($sid)) {
        return $false
    }

    return $sessions.ContainsKey($sid)
}

function Get-LoginPage {
    @"
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Server Installer Login</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 40px; background: #f6f8fa; }
    .card { max-width: 420px; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    input { width: 100%; padding: 10px; margin-top: 6px; margin-bottom: 12px; }
    button { padding: 10px 14px; border: 0; background: #0078d4; color: white; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Server Installer</h2>
    <form method="post" action="/login">
      <label>Server Username</label>
      <input name="username" required />
      <label>Server Password</label>
      <input name="password" type="password" required />
      <button type="submit">Login</button>
    </form>
  </div>
</body>
</html>
"@
}

function Get-DashboardPage {
    param([string]$Message = "")

    $safeMessage = [System.Web.HttpUtility]::HtmlEncode($Message)
    @"
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Server Installer Dashboard</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 30px; background: #f6f8fa; }
    .card { max-width: 760px; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full { grid-column: 1 / -1; }
    input, select { width: 100%; padding: 10px; margin-top: 4px; }
    button { padding: 10px 14px; border: 0; background: #107c10; color: white; border-radius: 6px; }
    .msg { margin-bottom: 12px; color: #0b6a0b; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Deployment Dashboard</h2>
    <div class="msg">$safeMessage</div>
    <form method="post" action="/install">
      <div class="grid">
        <label>Deployment Mode<select name="DeploymentMode"><option>IIS</option><option>Docker</option></select></label>
        <label>.NET Channel<input name="DotNetChannel" value="8.0" /></label>
        <label class="full">Source Path or URL<input name="SourceValue" placeholder="D:\app\published or https://..." required /></label>
        <label>Domain Name<input name="DomainName" /></label>
        <label>Site Name<input name="SiteName" value="DotNetApp" /></label>
        <label>HTTP Port<input name="SitePort" value="80" /></label>
        <label>HTTPS Port<input name="HttpsPort" value="443" /></label>
        <label>Docker Host Port<input name="DockerHostPort" value="8080" /></label>
      </div>
      <br />
      <button type="submit">Run Installation</button>
    </form>
  </div>
</body>
</html>
"@
}

function Invoke-InstallerFromForm {
    param([Parameter(Mandatory = $true)][hashtable]$Form)

    $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $installerScript)
    foreach ($key in @("DeploymentMode", "DotNetChannel", "SourceValue", "DomainName", "SiteName", "SitePort", "HttpsPort", "DockerHostPort")) {
        $value = $Form[$key]
        if ([string]::IsNullOrWhiteSpace($value)) {
            continue
        }
        $arguments += "-$key"
        $arguments += $value
    }

    $output = & powershell.exe @arguments 2>&1
    return ($output | Out-String)
}

Add-Type -AssemblyName System.Web
$listener = New-Object Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Dashboard started: http://localhost:$Port/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $path = $request.Url.AbsolutePath.ToLowerInvariant()

        if ($request.HttpMethod -eq "GET" -and $path -eq "/") {
            if (Test-Authenticated -Request $request) {
                Write-Response -Context $context -Content (Get-DashboardPage)
            }
            else {
                Write-Response -Context $context -Content (Get-LoginPage)
            }
            continue
        }

        if ($request.HttpMethod -eq "POST" -and $path -eq "/login") {
            $form = Get-FormData -Request $request
            $valid = ($form["username"] -eq $DashboardUser -and $form["password"] -eq $DashboardPassword)
            if (-not $valid) {
                Write-Response -Context $context -Content (Get-LoginPage) -StatusCode 401
                continue
            }

            $sid = [Guid]::NewGuid().ToString("N")
            $sessions[$sid] = $true
            $context.Response.Headers.Add("Set-Cookie", "sid=$sid; Path=/; HttpOnly")
            Write-Response -Context $context -Content (Get-DashboardPage -Message "Login successful.")
            continue
        }

        if ($request.HttpMethod -eq "POST" -and $path -eq "/install") {
            if (-not (Test-Authenticated -Request $request)) {
                Write-Response -Context $context -Content "Unauthorized" -ContentType "text/plain; charset=utf-8" -StatusCode 401
                continue
            }

            $form = Get-FormData -Request $request
            $result = Invoke-InstallerFromForm -Form $form
            $safe = [System.Web.HttpUtility]::HtmlEncode($result)
            $content = @"
<!doctype html><html><head><meta charset="utf-8"><title>Install Result</title></head>
<body style="font-family:Consolas,monospace;padding:20px;">
<h3>Installer Output</h3>
<pre>$safe</pre>
<a href="/">Back to dashboard</a>
</body></html>
"@
            Write-Response -Context $context -Content $content
            continue
        }

        Write-Response -Context $context -Content "Not Found" -ContentType "text/plain; charset=utf-8" -StatusCode 404
    }
}
finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
