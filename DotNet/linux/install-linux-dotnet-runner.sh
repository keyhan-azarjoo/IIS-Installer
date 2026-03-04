#!/usr/bin/env bash

set -euo pipefail

DOTNET_CHANNEL="${DOTNET_CHANNEL:-}"
DOTNET_INSTALL_SCRIPT_URL="${DOTNET_INSTALL_SCRIPT_URL:-https://dot.net/v1/dotnet-install.sh}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
SERVICE_NAME="${SERVICE_NAME:-dotnet-app}"
SERVICE_PORT="${SERVICE_PORT:-5000}"
APP_ROOT="/opt/dotnet-apps"
DOTNET_ROOT="/usr/share/dotnet"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this script as root or with sudo."
    exit 1
  fi
}

run_cmd() {
  echo ">> $*"
  "$@"
}

has_ca_bundle() {
  [[ -f /etc/ssl/certs/ca-certificates.crt || -f /etc/pki/tls/certs/ca-bundle.crt ]]
}

install_os_packages() {
  local need_curl=0
  local need_unzip=0
  local need_tar=0
  local need_ca=0

  command -v curl >/dev/null 2>&1 || need_curl=1
  command -v unzip >/dev/null 2>&1 || need_unzip=1
  command -v tar >/dev/null 2>&1 || need_tar=1
  has_ca_bundle || need_ca=1

  if [[ "${need_curl}" -eq 0 && "${need_unzip}" -eq 0 && "${need_tar}" -eq 0 && "${need_ca}" -eq 0 ]]; then
    echo "curl, unzip, tar, and CA certificates already available."
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    run_cmd apt-get update
    local packages=()
    [[ "${need_curl}" -eq 1 ]] && packages+=(curl)
    [[ "${need_unzip}" -eq 1 ]] && packages+=(unzip)
    [[ "${need_tar}" -eq 1 ]] && packages+=(tar)
    [[ "${need_ca}" -eq 1 ]] && packages+=(ca-certificates)
    if [[ "${#packages[@]}" -gt 0 ]]; then
      run_cmd apt-get install -y "${packages[@]}"
    fi
    return
  fi

  if command -v dnf >/dev/null 2>&1; then
    local packages=()
    [[ "${need_curl}" -eq 1 ]] && packages+=(curl)
    [[ "${need_unzip}" -eq 1 ]] && packages+=(unzip)
    [[ "${need_tar}" -eq 1 ]] && packages+=(tar)
    [[ "${need_ca}" -eq 1 ]] && packages+=(ca-certificates)
    if [[ "${#packages[@]}" -gt 0 ]]; then
      run_cmd dnf install -y "${packages[@]}"
    fi
    return
  fi

  if command -v yum >/dev/null 2>&1; then
    local packages=()
    [[ "${need_curl}" -eq 1 ]] && packages+=(curl)
    [[ "${need_unzip}" -eq 1 ]] && packages+=(unzip)
    [[ "${need_tar}" -eq 1 ]] && packages+=(tar)
    [[ "${need_ca}" -eq 1 ]] && packages+=(ca-certificates)
    if [[ "${#packages[@]}" -gt 0 ]]; then
      run_cmd yum install -y "${packages[@]}"
    fi
    return
  fi

  echo "Unsupported package manager. Install curl, unzip, tar, and CA certificates manually, then rerun this script."
  exit 1
}

dotnet_major_version() {
  local major_version
  major_version="$(printf '%s' "${DOTNET_CHANNEL}" | sed -E 's/^([0-9]+).*/\1/')"

  if [[ -z "${major_version}" ]]; then
    echo "Unable to determine a numeric .NET major version from '${DOTNET_CHANNEL}'. Use a major version like 8, 9, or 10 when idempotent install checks are required." >&2
    exit 1
  fi

  printf '%s\n' "${major_version}"
}

dotnet_sdk_installed() {
  local major_version
  major_version="$(dotnet_major_version)"

  if ! command -v dotnet >/dev/null 2>&1; then
    return 1
  fi

  dotnet --list-sdks 2>/dev/null | grep -Eq "^${major_version}\."
}

aspnet_runtime_installed() {
  local major_version
  major_version="$(dotnet_major_version)"

  if ! command -v dotnet >/dev/null 2>&1; then
    return 1
  fi

  dotnet --list-runtimes 2>/dev/null | grep -Eq "^Microsoft\.AspNetCore\.App ${major_version}\."
}

install_dotnet() {
  if dotnet_sdk_installed && aspnet_runtime_installed; then
    echo ".NET SDK and ASP.NET Core Runtime for channel ${DOTNET_CHANNEL} already installed."
    if [[ ! -x /usr/bin/dotnet ]]; then
      ln -sf "${DOTNET_ROOT}/dotnet" /usr/bin/dotnet
    fi
    return
  fi

  local installer
  installer="$(mktemp)"

  run_cmd curl -fsSL "${DOTNET_INSTALL_SCRIPT_URL}" -o "${installer}"
  chmod +x "${installer}"

  mkdir -p "${DOTNET_ROOT}"
  run_cmd "${installer}" --channel "${DOTNET_CHANNEL}" --install-dir "${DOTNET_ROOT}" --quality ga
  run_cmd "${installer}" --channel "${DOTNET_CHANNEL}" --runtime aspnetcore --install-dir "${DOTNET_ROOT}" --quality ga

  ln -sf "${DOTNET_ROOT}/dotnet" /usr/bin/dotnet
  rm -f "${installer}"
}

resolve_dotnet_channel() {
  local selection="${DOTNET_CHANNEL}"

  if [[ -z "${selection}" ]]; then
    echo "Choose a .NET release channel."
    echo "Examples: 8, 9, 10, 10.0, LTS, STS"
    read -r -p "Enter .NET channel (default: 8.0): " selection
  fi

  if [[ -z "${selection}" ]]; then
    DOTNET_CHANNEL="8.0"
    return
  fi

  if [[ "${selection}" =~ ^[0-9]+$ ]]; then
    DOTNET_CHANNEL="${selection}.0"
    return
  fi

  DOTNET_CHANNEL="${selection}"
}

ensure_service_user() {
  if ! id -u dotnetapp >/dev/null 2>&1; then
    run_cmd useradd --system --create-home --home-dir /home/dotnetapp --shell /usr/sbin/nologin dotnetapp
  fi
}

artifact_name() {
  local source_value="$1"
  local name
  source_value="${source_value%/}"
  name="$(basename "${source_value}")"
  name="${name%.zip}"
  name="${name%.tar.gz}"
  name="${name%.tgz}"
  printf '%s' "${name}"
}

is_url() {
  [[ "$1" =~ ^https?:// ]]
}

prompt_for_github_token() {
  local source_value="$1"

  if [[ "${source_value}" =~ ^https://(github\.com|api\.github\.com|objects\.githubusercontent\.com|raw\.githubusercontent\.com)/ ]]; then
    if [[ -z "${GITHUB_TOKEN}" ]]; then
      read -r -s -p "Enter GitHub token for private artifact access (leave blank for public download): " GITHUB_TOKEN
      echo
    fi
  fi
}

download_package() {
  local source_value="$1"
  local target_file="$2"

  prompt_for_github_token "${source_value}"

  if [[ -n "${GITHUB_TOKEN}" ]]; then
    run_cmd curl -fsSL -H "Authorization: Bearer ${GITHUB_TOKEN}" "${source_value}" -o "${target_file}"
    return
  fi

  run_cmd curl -fsSL "${source_value}" -o "${target_file}"
}

extract_package() {
  local source_file="$1"
  local target_path="$2"

  rm -rf "${target_path}"
  mkdir -p "${target_path}"

  case "${source_file}" in
    *.zip)
      run_cmd unzip -q "${source_file}" -d "${target_path}"
      ;;
    *.tar.gz|*.tgz)
      run_cmd tar -xzf "${source_file}" -C "${target_path}"
      ;;
    *)
      echo "Unsupported package format. Provide a published .zip or .tar.gz package, or a local published folder."
      exit 1
      ;;
  esac
}

find_app_dll() {
  local deployment_path="$1"
  local runtime_config
  runtime_config="$(find "${deployment_path}" -name '*.runtimeconfig.json' ! -path '*/ref/*' ! -path '*/refs/*' | head -n 1)"

  if [[ -n "${runtime_config}" ]]; then
    local base_name
    base_name="${runtime_config%.runtimeconfig.json}"
    if [[ -f "${base_name}.dll" ]]; then
      printf '%s\n' "${base_name}.dll"
      return
    fi
  fi

  local dll_path
  dll_path="$(find "${deployment_path}" -name '*.dll' ! -path '*/ref/*' ! -path '*/refs/*' | head -n 1)"
  if [[ -z "${dll_path}" ]]; then
    echo "No runnable application DLL was found. Provide a published framework-dependent build package or folder."
    exit 1
  fi

  printf '%s\n' "${dll_path}"
}

write_service() {
  local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
  local publish_path="$1"
  local dll_name="$2"

  cat > "${service_file}" <<EOF
[Unit]
Description=.NET application runner for ${SERVICE_NAME}
After=network.target

[Service]
WorkingDirectory=${publish_path}
ExecStart=/usr/bin/dotnet ${publish_path}/${dll_name}.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=${SERVICE_NAME}
User=dotnetapp
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:${SERVICE_PORT}

[Install]
WantedBy=multi-user.target
EOF
}

resolve_application_source() {
  local source_value="$1"
  local target_root="$2"
  local app_name
  app_name="$(artifact_name "${source_value}")"
  local target_path="${target_root}/${app_name}"

  if [[ -d "${source_value}" ]]; then
    rm -rf "${target_path}"
    run_cmd cp -R "${source_value}" "${target_path}"
    printf '%s\n' "${target_path}"
    return
  fi

  if [[ -f "${source_value}" ]]; then
    extract_package "${source_value}" "${target_path}"
    printf '%s\n' "${target_path}"
    return
  fi

  if ! is_url "${source_value}"; then
    echo "The source path '${source_value}' does not exist. Provide a valid local published folder, a local .zip/.tar.gz package, or a downloadable artifact URL."
    exit 1
  fi

  if [[ "${source_value}" =~ ^https://github\.com/[^/]+/[^/]+/?($|tree/|blob/) ]]; then
    echo "Provide a build artifact URL, not a GitHub repository page. Build the app first, package the published output, then use the artifact URL."
    exit 1
  fi

  local temp_suffix=".zip"
  case "${source_value}" in
    *.tar.gz|*.tgz)
      temp_suffix=".tar.gz"
      ;;
  esac

  local download_file
  download_file="$(mktemp --suffix "${temp_suffix}")"

  download_package "${source_value}" "${download_file}"
  extract_package "${download_file}" "${target_path}"
  rm -f "${download_file}"

  printf '%s\n' "${target_path}"
}

main() {
  require_root
  resolve_dotnet_channel
  install_os_packages
  install_dotnet
  ensure_service_user

  read -r -p "Enter a published build artifact URL, a local published folder path, or a local .zip/.tar.gz package path to deploy (leave blank to skip): " source_value
  if [[ -z "${source_value}" ]]; then
    echo "Setup completed. .NET prerequisites are installed."
    exit 0
  fi

  mkdir -p "${APP_ROOT}"

  local repo_path
  repo_path="$(resolve_application_source "${source_value}" "${APP_ROOT}")"

  local dll_path
  dll_path="$(find_app_dll "${repo_path}")"
  local dll_name
  dll_name="$(basename "${dll_path}" .dll)"
  local publish_path
  publish_path="$(dirname "${dll_path}")"

  chown -R dotnetapp:dotnetapp "${repo_path}"
  write_service "${publish_path}" "${dll_name}"

  run_cmd systemctl daemon-reload
  run_cmd systemctl enable --now "${SERVICE_NAME}"

  echo "Deployment complete."
  echo "Service: ${SERVICE_NAME}"
  echo "Kestrel URL: http://localhost:${SERVICE_PORT}"
}

main "$@"
