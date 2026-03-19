#!/usr/bin/env bash
# Native OS MongoDB installer for Linux (apt / yum / dnf).
# macOS is not supported for native mode — use the Docker tab instead.
set -euo pipefail

info() { printf '[INFO] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*" >&2; }
err()  { printf '[ERROR] %s\n' "$*" >&2; }

has_cmd() { command -v "$1" >/dev/null 2>&1; }

detect_os() {
  case "$(uname -s)" in
    Linux)  echo "linux"  ;;
    Darwin) echo "macos"  ;;
    *)      echo "unknown" ;;
  esac
}

detect_distro_id() {
  if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    ( . /etc/os-release; echo "${ID:-unknown}" )
  elif [ -f /etc/redhat-release ]; then
    echo "rhel"
  else
    echo "unknown"
  fi
}

detect_distro_codename() {
  if [ -f /etc/os-release ]; then
    ( . /etc/os-release; echo "${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}" )
  fi
}

require_port() {
  local name="$1" value="$2"
  case "$value" in ''|*[!0-9]*) err "$name must be numeric."; exit 1 ;; esac
  if [ "$value" -lt 1 ] || [ "$value" -gt 65535 ]; then
    err "$name must be between 1 and 65535."; exit 1
  fi
}

port_free() {
  local port="$1"
  if has_cmd ss;   then ! ss -ltn 2>/dev/null | awk '{print $4}' | grep -q ":${port}$" && return 0; fi
  if has_cmd lsof; then ! lsof -iTCP:"$port" -sTCP:LISTEN -Pn >/dev/null 2>&1 && return 0; fi
  return 0
}

wait_for_port() {
  local port="$1" timeout="${2:-45}" elapsed=0
  while [ "$elapsed" -lt "$timeout" ]; do
    if ! port_free "$port"; then return 0; fi
    sleep 1; elapsed=$((elapsed + 1))
  done
  return 1
}

open_linux_firewall_port() {
  local port="$1"
  if has_cmd ufw;          then ufw allow "${port}/tcp" >/dev/null 2>&1 || true; return; fi
  if has_cmd firewall-cmd; then
    firewall-cmd --permanent --add-port="${port}/tcp" >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
  fi
}

# ── Package installation ──────────────────────────────────────────────────────

install_mongod_debian_ubuntu() {
  local version="$1" codename="$2" distro_id="$3"
  info "Installing MongoDB ${version} via apt (${distro_id} / ${codename})..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y --no-install-recommends gnupg curl ca-certificates 2>&1 | tail -5
  curl -fsSL "https://www.mongodb.org/static/pgp/server-${version}.asc" \
    | gpg --batch --yes -o "/usr/share/keyrings/mongodb-server-${version}.gpg" --dearmor
  case "$distro_id" in
    ubuntu) echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${version}.gpg ] https://repo.mongodb.org/apt/ubuntu ${codename}/mongodb-org/${version} multiverse" \
        > "/etc/apt/sources.list.d/mongodb-org-${version}.list" ;;
    debian) echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${version}.gpg ] https://repo.mongodb.org/apt/debian ${codename}/mongodb-org/${version} main" \
        > "/etc/apt/sources.list.d/mongodb-org-${version}.list" ;;
  esac
  apt-get update -y 2>&1 | tail -5
  apt-get install -y mongodb-org 2>&1 | tail -20
}

install_mongod_rhel() {
  local version="$1"
  info "Installing MongoDB ${version} via yum/dnf..."
  cat > "/etc/yum.repos.d/mongodb-org-${version}.repo" <<EOF
[mongodb-org-${version}]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/${version}/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-${version}.asc
EOF
  if has_cmd dnf; then
    dnf install -y mongodb-org 2>&1 | tail -20
  else
    yum install -y mongodb-org 2>&1 | tail -20
  fi
}

ensure_mongod_installed() {
  local version="$1" distro_id="$2"
  if has_cmd mongod; then
    info "mongod already available: $(command -v mongod)"
    return
  fi
  local codename
  codename="$(detect_distro_codename)"
  case "$distro_id" in
    ubuntu|debian)
      if [ -z "$codename" ]; then
        err "Could not detect Ubuntu/Debian codename. Install MongoDB manually then retry."
        exit 1
      fi
      install_mongod_debian_ubuntu "$version" "$codename" "$distro_id"
      ;;
    rhel|centos|rocky|almalinux|ol|amzn|fedora)
      install_mongod_rhel "$version"
      ;;
    *)
      err "Unsupported distro: '${distro_id}'. Install MongoDB ${version} manually and ensure 'mongod' is in PATH, then retry."
      exit 1
      ;;
  esac
  if ! has_cmd mongod; then
    err "mongod not found after installation. Check the output above for errors."
    exit 1
  fi
  info "mongod installed: $(mongod --version | head -1)"
}

ensure_mongosh_installed() {
  if has_cmd mongosh; then
    info "mongosh available: $(command -v mongosh)"
    return
  fi
  info "mongosh not found — installing..."
  local distro_id="$1"
  case "$distro_id" in
    ubuntu|debian)
      apt-get install -y --no-install-recommends mongodb-mongosh 2>&1 | tail -10 || true
      ;;
    rhel|centos|rocky|almalinux|ol|amzn|fedora)
      if has_cmd dnf; then dnf install -y mongodb-mongosh 2>&1 | tail -10 || true;
      else yum install -y mongodb-mongosh 2>&1 | tail -10 || true; fi
      ;;
  esac
  if has_cmd mongosh; then
    info "mongosh installed."
  else
    warn "mongosh not available — admin user creation will be skipped. You can create the user manually."
  fi
}

# ── Config / service ──────────────────────────────────────────────────────────

write_mongod_config() {
  local cfg_file="$1" bind_ip="$2" port="$3" data_dir="$4" log_path="$5" auth_enabled="${6:-false}"
  mkdir -p "$data_dir" "$(dirname "$log_path")"
  chown -R mongod:mongod "$data_dir" "$(dirname "$log_path")" 2>/dev/null || true
  cat > "$cfg_file" <<EOF
storage:
  dbPath: "${data_dir}"
systemLog:
  destination: file
  logAppend: true
  path: "${log_path}"
net:
  bindIp: "${bind_ip}"
  port: ${port}
EOF
  if [ "$auth_enabled" = "true" ]; then
    printf 'security:\n  authorization: enabled\n' >> "$cfg_file"
  fi
}

start_mongod_with_config() {
  local cfg_file="$1" svc_name="$2"
  # If this instance uses its own service unit, use that; else fall back to system mongod
  if [ -f "/etc/systemd/system/${svc_name}.service" ]; then
    systemctl daemon-reload
    systemctl start "$svc_name" 2>/dev/null || true
  elif systemctl cat mongod >/dev/null 2>&1; then
    systemctl restart mongod 2>/dev/null || true
  fi
}

stop_mongod_service() {
  local svc_name="$1"
  systemctl stop "$svc_name" 2>/dev/null || true
  systemctl stop mongod 2>/dev/null || true
  # Kill lingering mongod on our port
  pkill -f "mongod" 2>/dev/null || true
  sleep 2
}

install_systemd_unit() {
  local svc_name="$1" cfg_file="$2" run_user="${3:-mongod}"
  cat > "/etc/systemd/system/${svc_name}.service" <<EOF
[Unit]
Description=MongoDB (${svc_name})
After=network.target
Documentation=https://docs.mongodb.org/manual

[Service]
User=${run_user}
Group=${run_user}
ExecStart=$(command -v mongod) --config ${cfg_file}
ExecStop=$(command -v mongod) --config ${cfg_file} --shutdown
RuntimeDirectory=mongodb
PIDFile=/var/run/mongodb/${svc_name}.pid
LimitNOFILE=64000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  # Make sure the run user exists (mongod package creates it; fall back to creating it)
  id "$run_user" >/dev/null 2>&1 || useradd -r -s /bin/false "$run_user" 2>/dev/null || true
  systemctl daemon-reload
  systemctl enable "$svc_name"
}

init_admin_user() {
  local host="$1" port="$2" mongo_user="$3" mongo_password="$4"
  if ! has_cmd mongosh; then
    warn "mongosh not available — skipping admin user creation."
    return 1
  fi
  local tmpjs
  tmpjs="$(mktemp /tmp/init-mongo-XXXXXX.js)"
  cat > "$tmpjs" <<JSEOF
const admin = db.getSiblingDB('admin');
const existing = admin.getUser('${mongo_user}');
if (!existing) {
  admin.createUser({
    user: '${mongo_user}',
    pwd: '${mongo_password}',
    roles: [{ role: 'root', db: 'admin' }]
  });
  print('Admin user created.');
} else {
  print('Admin user already exists.');
}
JSEOF
  local rc=0
  mongosh "mongodb://${host}:${port}/admin" --quiet --file "$tmpjs" || rc=$?
  rm -f "$tmpjs"
  return $rc
}

test_auth() {
  local host="$1" port="$2" mongo_user="$3" mongo_password="$4"
  if ! has_cmd mongosh; then return 1; fi
  local tmpjs
  tmpjs="$(mktemp /tmp/test-mongo-XXXXXX.js)"
  printf 'const r = db.runCommand({ping:1}); if(r.ok!==1){quit(2);}\n' > "$tmpjs"
  local rc=0
  mongosh "mongodb://${mongo_user}:${mongo_password}@${host}:${port}/admin?authSource=admin" \
    --quiet --file "$tmpjs" || rc=$?
  rm -f "$tmpjs"
  return $rc
}

write_install_info() {
  local root_dir="$1" svc_name="$2" host="$3" port="$4" version="$5" \
        auth_enabled="$6" mongo_user="$7" mongo_password="$8"
  mkdir -p "$root_dir"
  cat > "${root_dir}/install-info.json" <<EOF
{
  "mode": "native",
  "service_name": "${svc_name}",
  "host": "${host}",
  "mongo_port": ${port},
  "connection_string": "mongodb://${host}:${port}/",
  "version": "${version}",
  "web_version": "native-service",
  "auth_enabled": ${auth_enabled},
  "admin_user": "${mongo_user}",
  "admin_password": "${mongo_password}"
}
EOF
}

# ── Main ──────────────────────────────────────────────────────────────────────

main() {
  local os_name distro_id

  os_name="$(detect_os)"
  if [ "$os_name" = "macos" ]; then
    err "Native OS installation is not supported on macOS."
    err "Use the Docker tab to deploy MongoDB on macOS."
    exit 1
  fi
  if [ "$os_name" != "linux" ]; then
    err "Unsupported OS: $os_name"; exit 1
  fi

  distro_id="$(detect_distro_id)"
  info "===== Local MongoDB Installer (Linux / Native) ====="
  info "Distro: ${distro_id}"

  # ── Read parameters ────────────────────────────────────────────────────────
  local raw_instance instance_name
  raw_instance="${LOCALMONGO_INSTANCE_NAME:-localmongo}"
  # sanitize: lowercase letters, digits, hyphens only
  instance_name="$(printf '%s' "$raw_instance" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')"
  [ -n "$instance_name" ] || instance_name="localmongo"

  local host_value mongo_port mongo_user mongo_password version
  host_value="${LOCALMONGO_HOST:-${LOCALMONGO_HOST_IP:-}}"
  if [ -z "$host_value" ]; then
    host_value="$(hostname -I 2>/dev/null | awk '{print $1}')"
    [ -n "$host_value" ] || host_value="localhost"
  fi
  mongo_port="${LOCALMONGO_MONGO_PORT:-27017}"
  mongo_user="${LOCALMONGO_ADMIN_USER:-admin}"
  mongo_password="${LOCALMONGO_ADMIN_PASSWORD:-StrongPassword123}"
  version="${LOCALMONGO_VERSION:-7.0}"

  require_port "LOCALMONGO_MONGO_PORT" "$mongo_port"

  # ── Derived paths ──────────────────────────────────────────────────────────
  local svc_name root_dir cfg_file data_dir log_path
  svc_name="localmongodb-${instance_name}"
  root_dir="/opt/localmongodb-${instance_name}"
  cfg_file="${root_dir}/config/mongod.conf"
  data_dir="${root_dir}/data"
  log_path="${root_dir}/logs/mongod.log"
  mkdir -p "${root_dir}/config" "${root_dir}/logs"

  # ── Stop any existing instance ─────────────────────────────────────────────
  info "Stopping any existing '${svc_name}' instance..."
  systemctl stop "$svc_name" 2>/dev/null || true
  systemctl disable "$svc_name" 2>/dev/null || true
  pkill -f "mongod.*${cfg_file}" 2>/dev/null || true
  sleep 2

  if ! port_free "$mongo_port"; then
    err "Port ${mongo_port} is still in use after stopping the previous instance."
    exit 1
  fi

  # ── Install mongod ─────────────────────────────────────────────────────────
  ensure_mongod_installed "$version" "$distro_id"
  ensure_mongosh_installed "$distro_id"

  local mongod_version
  mongod_version="$(mongod --version 2>/dev/null | grep -oP 'db version v\K[^\s]+' || echo "")"

  # ── Configure and start (no-auth phase for user init) ─────────────────────
  local is_lan_ip=false
  case "$host_value" in
    localhost|127.0.0.1|'') is_lan_ip=false ;;
    *) is_lan_ip=true ;;
  esac

  local bind_ip="127.0.0.1"
  if $is_lan_ip; then bind_ip="127.0.0.1,${host_value}"; fi

  info "Writing mongod config: ${cfg_file}"
  write_mongod_config "$cfg_file" "$bind_ip" "$mongo_port" "$data_dir" "$log_path" "false"

  info "Installing systemd unit: ${svc_name}"
  install_systemd_unit "$svc_name" "$cfg_file"

  info "Starting ${svc_name} (no-auth) to initialize admin user..."
  systemctl start "$svc_name"

  if ! wait_for_port "$mongo_port" 45; then
    err "MongoDB did not open port ${mongo_port} in time."
    journalctl -u "$svc_name" --no-pager -n 40 2>/dev/null || true
    exit 1
  fi

  # ── Initialize admin user ─────────────────────────────────────────────────
  local auth_enabled="false"
  if init_admin_user "127.0.0.1" "$mongo_port" "$mongo_user" "$mongo_password"; then
    info "Admin user initialized. Enabling authentication..."
    systemctl stop "$svc_name"
    sleep 2
    write_mongod_config "$cfg_file" "$bind_ip" "$mongo_port" "$data_dir" "$log_path" "true"
    systemctl start "$svc_name"
    if ! wait_for_port "$mongo_port" 45; then
      err "MongoDB did not restart with auth enabled."
      journalctl -u "$svc_name" --no-pager -n 40 2>/dev/null || true
      exit 1
    fi
    if test_auth "127.0.0.1" "$mongo_port" "$mongo_user" "$mongo_password"; then
      auth_enabled="true"
      info "Authentication verified successfully."
    else
      warn "Authentication test failed. Reverting to no-auth mode."
      systemctl stop "$svc_name"
      sleep 1
      write_mongod_config "$cfg_file" "$bind_ip" "$mongo_port" "$data_dir" "$log_path" "false"
      systemctl start "$svc_name"
      wait_for_port "$mongo_port" 30 || true
    fi
  else
    warn "Could not initialize admin user (mongosh failed or not available)."
    warn "MongoDB is running without authentication. Create the admin user manually."
  fi

  # ── Firewall ───────────────────────────────────────────────────────────────
  open_linux_firewall_port "$mongo_port"

  # ── Write install-info.json ────────────────────────────────────────────────
  local primary_host
  primary_host="$( $is_lan_ip && echo "$host_value" || echo "127.0.0.1" )"
  write_install_info "$root_dir" "$svc_name" "$primary_host" "$mongo_port" \
    "$mongod_version" "$auth_enabled" "$mongo_user" "$mongo_password"

  # ── Done ───────────────────────────────────────────────────────────────────
  printf '\n===== INSTALLATION COMPLETE =====\n'
  printf 'MongoDB service:               %s\n' "$svc_name"
  if $is_lan_ip; then
    printf 'MongoDB connection:            mongodb://%s:%s/\n' "$host_value" "$mongo_port"
  else
    printf 'MongoDB connection:            mongodb://127.0.0.1:%s/\n' "$mongo_port"
  fi
  [ -n "$mongod_version" ] && printf 'MongoDB version:               %s\n' "$mongod_version"
  if [ "$auth_enabled" = "true" ]; then
    printf 'MongoDB root user:             %s\n' "$mongo_user"
    printf 'MongoDB root password:         %s\n' "$mongo_password"
  else
    printf 'Authentication:                not initialized — create admin user manually\n'
  fi
  printf 'Data directory:                %s\n' "$data_dir"
  printf 'Config file:                   %s\n' "$cfg_file"
  printf 'Log file:                      %s\n' "$log_path"
  printf 'Service:                       %s (enabled)\n' "$svc_name"
}

main "$@"
