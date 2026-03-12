#!/usr/bin/env bash
set -euo pipefail

info() { printf '[INFO] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*" >&2; }
err() { printf '[ERROR] %s\n' "$*" >&2; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PANEL_DIR="/opt/proxy-panel"
LOCK_FILE="/var/lock/server-installer-proxy.lock"
TARGET_LAYER="${PROXY_LAYER:-layer3-basic}"
DOMAIN_VALUE="${PROXY_DOMAIN:-}"
EMAIL_VALUE="${PROXY_EMAIL:-}"
DUCKDNS_TOKEN_VALUE="${PROXY_DUCKDNS_TOKEN:-}"
PANEL_PORT_VALUE="${PROXY_PANEL_PORT:-8443}"

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    err "This installer must run as root."
    exit 1
  fi
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

acquire_lock() {
  mkdir -p "$(dirname "$LOCK_FILE")"
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    err "Another proxy installation or switch is already running."
    exit 1
  fi
}

validate_layout() {
  if [ ! -d "$ROOT_DIR/panel" ] || [ ! -d "$ROOT_DIR/common" ] || [ ! -d "$ROOT_DIR/layers" ]; then
    err "Proxy layout is incomplete at $ROOT_DIR."
    exit 1
  fi
  if [ ! -f "$ROOT_DIR/layers/$TARGET_LAYER/install.sh" ]; then
    err "Unknown proxy layer: $TARGET_LAYER"
    exit 1
  fi
  if ! [[ "$PANEL_PORT_VALUE" =~ ^[0-9]+$ ]] || [ "$PANEL_PORT_VALUE" -lt 1 ] || [ "$PANEL_PORT_VALUE" -gt 65535 ]; then
    err "PROXY_PANEL_PORT must be a valid TCP port."
    exit 1
  fi
}

sync_repo() {
  mkdir -p "$PANEL_DIR"
  rm -rf "$PANEL_DIR/repo"
  mkdir -p "$PANEL_DIR/repo"
  cp -a "$ROOT_DIR/common" "$PANEL_DIR/repo/"
  cp -a "$ROOT_DIR/layers" "$PANEL_DIR/repo/"
  cp -a "$ROOT_DIR/panel" "$PANEL_DIR/repo/"
  if [ -d "$ROOT_DIR/docs" ]; then
    cp -a "$ROOT_DIR/docs" "$PANEL_DIR/repo/"
  fi
}

maybe_uninstall_existing() {
  if [ -f "$ROOT_DIR/common/uninstall.sh" ] && { [ -f "$PANEL_DIR/panel.conf" ] || systemctl list-unit-files 2>/dev/null | grep -qE '^(proxy-panel|xray|stunnel4|nginx)\.service'; }; then
    info "Cleaning existing proxy stack before reinstall..."
    bash "$ROOT_DIR/common/uninstall.sh" || warn "Existing proxy cleanup reported an error; continuing."
  fi
}

build_install_input() {
  case "$TARGET_LAYER" in
    layer7-real-domain|layer7-iran-optimized)
      if [ -z "$DOMAIN_VALUE" ] || [ -z "$EMAIL_VALUE" ]; then
        err "PROXY_DOMAIN and PROXY_EMAIL are required for $TARGET_LAYER."
        exit 1
      fi
      printf '%s\n%s\n%s\n' "$DOMAIN_VALUE" "$EMAIL_VALUE" "$DUCKDNS_TOKEN_VALUE"
      ;;
    *)
      printf ''
      ;;
  esac
}

run_layer_install() {
  info "Installing proxy layer $TARGET_LAYER..."
  export PROXY_SKIP_PANEL_INSTALL=1
  if [[ "$TARGET_LAYER" == layer7-real-domain || "$TARGET_LAYER" == layer7-iran-optimized ]]; then
    build_install_input | bash "$ROOT_DIR/layers/$TARGET_LAYER/install.sh"
  else
    bash "$ROOT_DIR/layers/$TARGET_LAYER/install.sh"
  fi
}

run_panel_install() {
  info "Installing proxy management panel..."
  PROXY_REPO_ROOT="$PANEL_DIR/repo" PROXY_PANEL_PORT="$PANEL_PORT_VALUE" bash "$ROOT_DIR/panel/install-panel.sh" "--layer=$TARGET_LAYER" "--repo-root=$PANEL_DIR/repo" "--port=$PANEL_PORT_VALUE"
}

wait_for_service() {
  local svc="$1" timeout="${2:-90}" elapsed=0
  while [ "$elapsed" -lt "$timeout" ]; do
    if systemctl is-active --quiet "$svc"; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

get_host_ip() {
  hostname -I 2>/dev/null | awk '{print $1}' || true
}

main() {
  require_root
  acquire_lock
  validate_layout
  sync_repo
  maybe_uninstall_existing
  run_layer_install
  sync_repo
  run_panel_install

  if ! wait_for_service "proxy-panel" 90; then
    err "proxy-panel.service did not become active."
    exit 1
  fi

  local_ip="$(get_host_ip)"
  if [ -z "$local_ip" ]; then
    local_ip="127.0.0.1"
  fi

  info "Proxy installation completed."
  info "Layer: $TARGET_LAYER"
  info "Panel URL: https://$local_ip:$PANEL_PORT_VALUE"
}

main "$@"
