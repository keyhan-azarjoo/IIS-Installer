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

if (-not (Test-IsAdmin)) {
  Fail "This installer must run as Administrator."
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$proxyRoot = Split-Path -Parent $scriptRoot
$linuxInstallerWindows = Join-Path $proxyRoot "linux-macos\setup-proxy.sh"
$linuxInstallerWsl = Convert-ToWslPath $linuxInstallerWindows
$repoRootWsl = Convert-ToWslPath (Join-Path $proxyRoot "source")
$stateDir = Join-Path $env:ProgramData "Server-Installer\proxy"
$stateFile = Join-Path $stateDir "proxy-wsl.json"
$distro = Get-EnvOrDefault "PROXY_WSL_DISTRO" "Ubuntu"
$layer = Get-EnvOrDefault "PROXY_LAYER" "layer3-basic"
$domain = Get-EnvOrDefault "PROXY_DOMAIN" ""
$email = Get-EnvOrDefault "PROXY_EMAIL" ""
$duckdns = Get-EnvOrDefault "PROXY_DUCKDNS_TOKEN" ""

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
  Fail "WSL is not available on this machine."
}

Info "Checking WSL distro '$distro'..."
$distros = & wsl.exe -l -q 2>$null
if (-not ($distros | Where-Object { $_.Trim() -eq $distro })) {
  Info "Installing WSL distro '$distro'..."
  & wsl.exe --install -d $distro
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
& wsl.exe -d $distro --user root -- bash -lc $enableSystemd
& wsl.exe --shutdown
Start-Sleep -Seconds 3

Info "Running Linux proxy installer inside WSL..."
$installCommand = @"
set -e
export PROXY_REPO_ROOT='$repoRootWsl'
export PROXY_LAYER='$layer'
export PROXY_DOMAIN='$domain'
export PROXY_EMAIL='$email'
export PROXY_DUCKDNS_TOKEN='$duckdns'
bash '$linuxInstallerWsl'
"@
& wsl.exe -d $distro --user root -- bash -lc $installCommand

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
& wsl.exe -d $distro --user root -- bash -lc $keepAliveInstall

$taskName = "ServerInstaller-ProxyWSL"
$taskCommand = "wsl.exe -d $distro --user root -- bash -lc '/usr/local/bin/server-installer-proxy-keepalive.sh'"
schtasks /Delete /TN $taskName /F 1>$null 2>$null | Out-Null
schtasks /Create /TN $taskName /SC ONSTART /RU SYSTEM /RL HIGHEST /TR $taskCommand /F | Out-Null

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
@{
  distro = $distro
  layer = $layer
  url = "https://127.0.0.1:8443"
  installed_at = (Get-Date).ToString("s")
} | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8

Info "Proxy installation completed."
Info "Proxy dashboard: https://127.0.0.1:8443"
