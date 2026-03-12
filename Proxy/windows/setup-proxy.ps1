$ErrorActionPreference = "Stop"

function Info([string]$message) { Write-Host "[INFO] $message" }
function Warn([string]$message) { Write-Warning $message }
function Fail([string]$message) { throw $message }

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($id)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Convert-ToWslPath([string]$windowsPath) {
  $full = [System.IO.Path]::GetFullPath($windowsPath)
  $drive = $full.Substring(0,1).ToLowerInvariant()
  $rest = $full.Substring(2).Replace('\', '/')
  return "/mnt/$drive$rest"
}

function Get-EnvOrDefault([string]$name, [string]$defaultValue) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) { return $defaultValue }
  return $value.Trim()
}

function Invoke-Wsl([string[]]$Arguments) {
  $output = & wsl.exe @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = (($output | ForEach-Object { "$_" }) -join "`n")
  $text = $text.Replace([string][char]0, '').Replace([string][char]0xFEFF, '').Trim()
  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = $text
  }
}

function Invoke-WslOrFail([string[]]$Arguments, [string]$failureMessage) {
  $result = Invoke-Wsl $Arguments
  if ($result.ExitCode -ne 0) {
    $detail = if ($result.Output) { "`n$result.Output" } else { "" }
    Fail "$failureMessage$detail"
  }
  return $result.Output
}

function Get-WslHelpText() {
  return (Invoke-Wsl @("--help")).Output
}

function Test-WslSupportsOption([string]$option, [string]$helpText) {
  return $helpText -match [Regex]::Escape($option)
}

function Test-WslDistroAvailable([string]$name, [string]$helpText) {
  if (Test-WslSupportsOption "--list" $helpText -or Test-WslSupportsOption "-l," $helpText) {
    $result = Invoke-Wsl @("-l", "-q")
    if ($result.ExitCode -eq 0) {
      return ($result.Output -split "`r?`n" | Where-Object { $_.Trim() -eq $name }).Count -gt 0
    }
  }

  $probe = Invoke-Wsl @("-d", $name, "-e", "/bin/true")
  return $probe.ExitCode -eq 0
}

if (-not (Test-IsAdmin)) {
  Fail "This installer must run as Administrator."
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$proxyRoot = Split-Path -Parent $scriptRoot
$linuxInstallerWindows = Join-Path $proxyRoot "linux-macos\setup-proxy.sh"
$linuxInstallerWsl = Convert-ToWslPath $linuxInstallerWindows
$repoRootWsl = Convert-ToWslPath $proxyRoot
$stateDir = Join-Path $env:ProgramData "Server-Installer\proxy"
$stateFile = Join-Path $stateDir "proxy-wsl.json"
$distro = Get-EnvOrDefault "PROXY_WSL_DISTRO" "Ubuntu"
$layer = Get-EnvOrDefault "PROXY_LAYER" "layer3-basic"
$domain = Get-EnvOrDefault "PROXY_DOMAIN" ""
$email = Get-EnvOrDefault "PROXY_EMAIL" ""
$duckdns = Get-EnvOrDefault "PROXY_DUCKDNS_TOKEN" ""
$panelPort = Get-EnvOrDefault "PROXY_PANEL_PORT" "8443"

if ($panelPort -notmatch '^\d+$') {
  Fail "PROXY_PANEL_PORT must be numeric."
}

$panelPortNumber = [int]$panelPort
if ($panelPortNumber -lt 1 -or $panelPortNumber -gt 65535) {
  Fail "PROXY_PANEL_PORT must be between 1 and 65535."
}

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
  Fail "WSL is not available on this machine."
}

$wslHelp = Get-WslHelpText

Info "Checking WSL distro '$distro'..."
if (-not (Test-WslDistroAvailable $distro $wslHelp)) {
  if (-not (Test-WslSupportsOption "--install" $wslHelp)) {
    Fail "WSL distro '$distro' is not installed, and this Windows build does not support 'wsl --install'. Install Ubuntu manually or upgrade WSL/Windows, then rerun the Proxy installer."
  }

  Info "Installing WSL distro '$distro'..."
  Invoke-WslOrFail @("--install", "-d", $distro) "Failed to start WSL distro installation."
  throw "WSL distro installation started. Reboot if Windows requests it, then rerun the Proxy installer."
}

Info "Enabling systemd inside WSL..."
$enableSystemd = @"
set -e
mkdir -p /etc
python3 - <<'PY'
from pathlib import Path
path = Path('/etc/wsl.conf')
text = path.read_text(encoding='utf-8') if path.exists() else ''
if '[boot]' in text and 'systemd=true' in text:
    raise SystemExit(0)
lines = [line.rstrip() for line in text.splitlines() if line.strip()]
if '[boot]' not in lines:
    lines.extend(['[boot]', 'systemd=true'])
elif 'systemd=true' not in lines:
    idx = lines.index('[boot]')
    lines.insert(idx + 1, 'systemd=true')
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
PY
"@
Invoke-WslOrFail @("-d", $distro, "--user", "root", "--", "bash", "-lc", $enableSystemd) "Failed to update /etc/wsl.conf inside WSL."

if (Test-WslSupportsOption "--shutdown" $wslHelp) {
  Invoke-WslOrFail @("--shutdown") "Failed to restart WSL after enabling systemd."
  Start-Sleep -Seconds 3
} else {
  Warn "This WSL build does not support 'wsl --shutdown'. A Windows reboot may be required before systemd becomes active."
}

$initProcess = Invoke-WslOrFail @("-d", $distro, "--user", "root", "--", "bash", "-lc", "ps -p 1 -o comm= 2>/dev/null || true") "Failed to verify WSL init system."
if (($initProcess | Out-String).Trim() -ne "systemd") {
  Fail "systemd is not active in WSL distro '$distro'. The Proxy installer requires a newer WSL release with systemd support. Update WSL/Windows, reboot, and rerun the installer."
}

Info "Running Linux proxy installer inside WSL..."
$installCommand = @"
set -e
export PROXY_REPO_ROOT='$repoRootWsl'
export PROXY_LAYER='$layer'
export PROXY_DOMAIN='$domain'
export PROXY_EMAIL='$email'
export PROXY_DUCKDNS_TOKEN='$duckdns'
export PROXY_PANEL_PORT='$panelPort'
bash '$linuxInstallerWsl'
"@
Invoke-WslOrFail @("-d", $distro, "--user", "root", "--", "bash", "-lc", $installCommand) "Linux proxy installer failed inside WSL."

Info "Configuring WSL keepalive + autostart task..."
$keepAliveInstall = @"
cat >/usr/local/bin/server-installer-proxy-keepalive.sh <<'EOF'
#!/usr/bin/env bash
set -e
mkdir -p /var/run/server-installer
if [ -f /var/run/server-installer/proxy-keepalive.pid ] && kill -0 \$(cat /var/run/server-installer/proxy-keepalive.pid) 2>/dev/null; then
  :
else
  nohup bash -lc 'while true; do sleep 3600; done' >/var/log/proxy-wsl-keepalive.log 2>&1 &
  echo \$! >/var/run/server-installer/proxy-keepalive.pid
fi
systemctl start proxy-panel >/dev/null 2>&1 || true
systemctl start xray >/dev/null 2>&1 || true
systemctl start stunnel4 >/dev/null 2>&1 || true
systemctl start nginx >/dev/null 2>&1 || true
service ssh start >/dev/null 2>&1 || true
EOF
chmod +x /usr/local/bin/server-installer-proxy-keepalive.sh
/usr/local/bin/server-installer-proxy-keepalive.sh
"@
Invoke-WslOrFail @("-d", $distro, "--user", "root", "--", "bash", "-lc", $keepAliveInstall) "Failed to configure Proxy keepalive inside WSL."

$taskName = "ServerInstaller-ProxyWSL"
$taskCommand = "wsl.exe -d $distro --user root -- bash -lc '/usr/local/bin/server-installer-proxy-keepalive.sh'"
schtasks /Delete /TN $taskName /F 1>$null 2>$null | Out-Null
schtasks /Create /TN $taskName /SC ONSTART /RU SYSTEM /RL HIGHEST /TR $taskCommand /F | Out-Null

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
@{
  distro = $distro
  layer = $layer
  url = "https://127.0.0.1:$panelPort"
  port = $panelPort
  installed_at = (Get-Date).ToString("s")
} | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8

Info "Proxy installation completed."
Info "Proxy dashboard: https://127.0.0.1:$panelPort"
