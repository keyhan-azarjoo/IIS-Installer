#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Proxy Management Panel Installer
# Installs the web-based CRM panel for proxy user management
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PANEL_DIR="/opt/proxy-panel"
PANEL_PORT="${PROXY_PANEL_PORT:-8443}"
XRAY_STATS_PORT=10085
LOG_FILE="/var/log/proxy-panel.log"
LAYER="unknown"
REPO_ROOT="${PROXY_REPO_ROOT:-}"
REPO_BASE="https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/panel"

# ─── Parse Arguments ──────────────────────────────────────────────────────────

for arg in "$@"; do
    case $arg in
        --layer=*)
            LAYER="${arg#*=}"
            ;;
        --repo-root=*)
            REPO_ROOT="${arg#*=}"
            ;;
        --port=*)
            PANEL_PORT="${arg#*=}"
            ;;
    esac
done

# ─── Helpers ──────────────────────────────────────────────────────────────────

log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

validate_panel_port() {
    if ! [[ "$PANEL_PORT" =~ ^[0-9]+$ ]] || [ "$PANEL_PORT" -lt 1 ] || [ "$PANEL_PORT" -gt 65535 ]; then
        log_msg "ERROR: Invalid panel port '$PANEL_PORT'."
        exit 1
    fi
}

port_in_use() {
    local port="$1"
    ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "(^|:)${port}$"
}


disable_plesk() {
    if ! command -v systemctl >/dev/null 2>&1; then
        return 1
    fi
    if systemctl list-unit-files 2>/dev/null | grep -qE '^(sw-cp-server|sw-engine|plesk)\.service'; then
        log_msg "Plesk detected. Disabling to free port $PANEL_PORT..."
        systemctl stop sw-cp-server sw-engine plesk >/dev/null 2>&1 || true
        systemctl disable sw-cp-server sw-engine plesk >/dev/null 2>&1 || true
        sleep 2
        return 0
    fi
    return 1
}

proxy_panel_active() {
    if ! command -v systemctl >/dev/null 2>&1; then
        return 1
    fi
    systemctl is-active --quiet proxy-panel
}

stop_proxy_panel() {
    if ! command -v systemctl >/dev/null 2>&1; then
        return 1
    fi
    if systemctl list-unit-files 2>/dev/null | grep -q '^proxy-panel\.service'; then
        if systemctl is-active --quiet proxy-panel; then
            log_msg "Proxy panel is running. Stopping it to free port $PANEL_PORT..."
            systemctl stop proxy-panel >/dev/null 2>&1 || true
            sleep 2
            return 0
        fi
    fi
    return 1
}

# ─── Pre-flight ───────────────────────────────────────────────────────────────

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

log_msg "Installing Proxy Management Panel (layer: $LAYER)..."
validate_panel_port

# ─── Create Directory Structure ───────────────────────────────────────────────

mkdir -p "$PANEL_DIR"/{templates,static,certs,data,scripts}
log_msg "Created panel directory structure"

# ─── Download Panel Files ─────────────────────────────────────────────────────

download_file() {
    local url="$1"
    local dest="$2"
    if curl -fsSL "$url" -o "$dest" 2>/dev/null; then
        log_msg "Downloaded: $dest"
    else
        log_msg "WARN: Failed to download $url, checking local copy..."
        # Try local copy from repo
        local script_dir
        script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        local relative="${dest#$PANEL_DIR/}"
        if [ -f "$script_dir/$relative" ]; then
            cp "$script_dir/$relative" "$dest"
            log_msg "Copied from local: $dest"
        else
            log_msg "ERROR: Could not get $relative"
            return 1
        fi
    fi
}

# Try downloading from repo first, fall back to local copy
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -z "$REPO_ROOT" ] && [ -d "$SCRIPT_DIR/.." ]; then
    REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

sync_repo_root() {
    if [ -n "$REPO_ROOT" ] && [ -d "$REPO_ROOT" ]; then
        rm -rf "$PANEL_DIR/repo"
        mkdir -p "$PANEL_DIR/repo"
        for entry in common layers panel docs; do
            if [ -e "$REPO_ROOT/$entry" ]; then
                cp -a "$REPO_ROOT/$entry" "$PANEL_DIR/repo/"
            fi
        done
        log_msg "Synced local proxy repo to $PANEL_DIR/repo"
    fi
}

copy_or_download() {
    local relative="$1"
    local dest="$PANEL_DIR/$relative"
    local dest_dir
    dest_dir="$(dirname "$dest")"
    mkdir -p "$dest_dir"

    if [ -n "$REPO_ROOT" ] && [ -f "$REPO_ROOT/panel/$relative" ]; then
        cp "$REPO_ROOT/panel/$relative" "$dest"
        log_msg "Installed from repo root: $relative"
    elif [ -f "$SCRIPT_DIR/$relative" ]; then
        cp "$SCRIPT_DIR/$relative" "$dest"
        log_msg "Installed: $relative"
    else
        download_file "$REPO_BASE/$relative" "$dest"
    fi
}

sync_repo_root
copy_or_download "proxy-panel.py"
copy_or_download "templates/login.html"
copy_or_download "templates/dashboard.html"
copy_or_download "static/style.css"
copy_or_download "static/app.js"

chmod +x "$PANEL_DIR/proxy-panel.py"

if [ -f "$PANEL_DIR/panel.conf" ] && command -v python3 >/dev/null 2>&1; then
    PANEL_PORT_VALUE="$PANEL_PORT" python3 - <<'PY'
import json
import os
path = "/opt/proxy-panel/panel.conf"
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
data["port"] = int(os.environ["PANEL_PORT_VALUE"])
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
PY
    chmod 600 "$PANEL_DIR/panel.conf" || true
fi

if port_in_use "$PANEL_PORT"; then
    disable_plesk || true
fi

if port_in_use "$PANEL_PORT"; then
    stop_proxy_panel || true
fi

if port_in_use "$PANEL_PORT"; then
    if proxy_panel_active; then
        log_msg "Port $PANEL_PORT is already in use by proxy-panel. Continuing reinstall..."
    else
    log_msg "ERROR: Port $PANEL_PORT is in use and could not be freed. Aborting panel install."
    exit 1
    fi
fi

# ─── Copy Management Scripts ──────────────────────────────────────────────────

# Determine which scripts to use based on layer
if [[ "$LAYER" == layer7-* ]]; then
    # V2Ray layer - copy from layer-specific directory
    LAYER_DIR="$PANEL_DIR/repo/layers/$LAYER"
    if [ ! -d "$LAYER_DIR" ]; then
        LAYER_DIR="$SCRIPT_DIR/../layers/$LAYER"
    fi
    if [ -f "$LAYER_DIR/add-user.sh" ]; then
        cp "$LAYER_DIR/add-user.sh" "$PANEL_DIR/scripts/add-user.sh"
        chmod +x "$PANEL_DIR/scripts/add-user.sh"
        log_msg "Copied V2Ray add-user.sh from $LAYER"
    fi
    if [ -f "$LAYER_DIR/delete-user.sh" ]; then
        cp "$LAYER_DIR/delete-user.sh" "$PANEL_DIR/scripts/delete-user.sh"
        chmod +x "$PANEL_DIR/scripts/delete-user.sh"
        log_msg "Copied V2Ray delete-user.sh from $LAYER"
    fi
else
    # SSH layer - copy from common
    COMMON_DIR="$PANEL_DIR/repo/common"
    if [ ! -d "$COMMON_DIR" ]; then
        COMMON_DIR="$SCRIPT_DIR/../common"
    fi
    if [ -f "$COMMON_DIR/add-user.sh" ]; then
        cp "$COMMON_DIR/add-user.sh" "$PANEL_DIR/scripts/add-user.sh"
        chmod +x "$PANEL_DIR/scripts/add-user.sh"
        log_msg "Copied SSH add-user.sh"
    fi
    if [ -f "$COMMON_DIR/delete-user.sh" ]; then
        cp "$COMMON_DIR/delete-user.sh" "$PANEL_DIR/scripts/delete-user.sh"
        chmod +x "$PANEL_DIR/scripts/delete-user.sh"
        log_msg "Copied SSH delete-user.sh"
    fi
fi

# ─── Generate Self-Signed TLS Certificate ────────────────────────────────────

if [ ! -f "$PANEL_DIR/certs/panel.pem" ]; then
    log_msg "Generating self-signed TLS certificate..."
    openssl req -new -x509 -nodes -days 3650 \
        -keyout "$PANEL_DIR/certs/panel.key" \
        -out "$PANEL_DIR/certs/panel.pem" \
        -subj "/CN=proxy-panel/O=Proxy/C=US" \
        2>/dev/null
    chmod 600 "$PANEL_DIR/certs/panel.key"
    chmod 644 "$PANEL_DIR/certs/panel.pem"
    log_msg "TLS certificate generated"
else
    log_msg "TLS certificate already exists, skipping generation"
fi

# ─── Generate Panel Configuration ────────────────────────────────────────────

if [ ! -f "$PANEL_DIR/panel.conf" ]; then
    SECRET_KEY=$(openssl rand -hex 32)

    # Determine service type and user management
    SERVICE_TYPE="ssh"
    USER_MGMT="ssh"
    if [[ "$LAYER" == layer7-* ]]; then
        SERVICE_TYPE="xray"
        USER_MGMT="v2ray"
    fi

    cat > "$PANEL_DIR/panel.conf" << CONF
{
  "port": $PANEL_PORT,
  "layer": "$LAYER",
  "secret_key": "$SECRET_KEY",
  "session_timeout": 86400,
  "service_type": "$SERVICE_TYPE",
  "user_management": "$USER_MGMT",
  "xray_stats_port": $XRAY_STATS_PORT,
  "scripts_dir": "$PANEL_DIR/scripts",
  "repo_root": "$PANEL_DIR/repo"
}
CONF
    chmod 600 "$PANEL_DIR/panel.conf"
    log_msg "Panel configuration generated"
else
    log_msg "Panel configuration already exists, skipping"
fi

# ─── Install vnstat for Bandwidth Monitoring ──────────────────────────────────

if ! command -v vnstat &>/dev/null; then
    log_msg "Installing vnstat for bandwidth monitoring..."
    apt-get update -qq
    apt-get install -y -qq vnstat >/dev/null 2>&1
    systemctl enable vnstat >/dev/null 2>&1 || true
    systemctl start vnstat >/dev/null 2>&1 || true
    log_msg "vnstat installed"
else
    log_msg "vnstat already installed"
fi

# ─── Enable Xray Stats API (V2Ray layers only) ───────────────────────────────

if [[ "$LAYER" == layer7-* ]]; then
    XRAY_CONFIG="/usr/local/etc/xray/config.json"
    if [ -f "$XRAY_CONFIG" ]; then
        # Check if stats API is already enabled
        if ! grep -q '"StatsService"' "$XRAY_CONFIG" 2>/dev/null; then
            log_msg "Enabling Xray Stats API..."

            # Install jq if not present
            if ! command -v jq &>/dev/null; then
                apt-get install -y -qq jq >/dev/null 2>&1
            fi

            # Backup config
            cp "$XRAY_CONFIG" "$XRAY_CONFIG.bak.$(date +%s)"

            # Add stats, api, and policy sections
            jq '. + {
                "stats": {},
                "api": {
                    "tag": "api",
                    "services": ["StatsService"]
                },
                "policy": {
                    "levels": {
                        "0": {
                            "statsUserUplink": true,
                            "statsUserDownlink": true
                        }
                    },
                    "system": {
                        "statsInboundUplink": true,
                        "statsInboundDownlink": true
                    }
                }
            }' "$XRAY_CONFIG" > "$XRAY_CONFIG.tmp"

            # Add dokodemo-door inbound for API
            jq --argjson port "$XRAY_STATS_PORT" \
                '.inbounds = [{
                    "tag": "api",
                    "listen": "127.0.0.1",
                    "port": $port,
                    "protocol": "dokodemo-door",
                    "settings": {
                        "address": "127.0.0.1"
                    }
                }] + .inbounds' "$XRAY_CONFIG.tmp" > "$XRAY_CONFIG.tmp2"

            # Add routing rule for API
            jq '.routing.rules = [{
                "type": "field",
                "inboundTag": ["api"],
                "outboundTag": "api"
            }] + (.routing.rules // [])
            | .outbounds = (.outbounds // []) + (if any(.outbounds[]?; .tag == "api") then [] else [{"tag": "api", "protocol": "blackhole", "settings": {}}] end)' \
                "$XRAY_CONFIG.tmp2" > "$XRAY_CONFIG.tmp3"

            # Add email field to existing clients for stats tracking
            jq '(.inbounds[] | select(.protocol == "vless" or .protocol == "vmess") | .settings.clients[]?) |= (if .email == null then . + {"email": (.id[0:8] + "@proxy")} else . end)' \
                "$XRAY_CONFIG.tmp3" > "$XRAY_CONFIG.new"

            # Also update users.json emails
            USERS_FILE="/usr/local/etc/xray/users.json"
            if [ -f "$USERS_FILE" ] && command -v jq &>/dev/null; then
                # Update config.json client emails to match username@proxy format
                TEMP_CONFIG="$XRAY_CONFIG.new"
                for username in $(jq -r 'keys[]' "$USERS_FILE" 2>/dev/null); do
                    uuid=$(jq -r --arg u "$username" '.[$u]' "$USERS_FILE")
                    jq --arg uuid "$uuid" --arg email "${username}@proxy" \
                        '(.inbounds[] | select(.protocol == "vless" or .protocol == "vmess") | .settings.clients[] | select(.id == $uuid)) .email = $email' \
                        "$TEMP_CONFIG" > "$TEMP_CONFIG.tmp" && mv "$TEMP_CONFIG.tmp" "$TEMP_CONFIG"
                done
            fi

            # Apply new config
            if [ -f "$XRAY_CONFIG.new" ]; then
                mv "$XRAY_CONFIG.new" "$XRAY_CONFIG"
                rm -f "$XRAY_CONFIG.tmp" "$XRAY_CONFIG.tmp2" "$XRAY_CONFIG.tmp3"
                systemctl restart xray >/dev/null 2>&1 || true
                log_msg "Xray Stats API enabled"
            else
                log_msg "WARN: Failed to update Xray config for Stats API"
                # Restore backup
                LATEST_BAK=$(ls -t "$XRAY_CONFIG.bak."* 2>/dev/null | head -1)
                if [ -n "$LATEST_BAK" ]; then
                    mv "$LATEST_BAK" "$XRAY_CONFIG"
                fi
            fi
        else
            log_msg "Xray Stats API already enabled"
        fi
    fi
fi

# ─── Install systemd Service ─────────────────────────────────────────────────

cat > /etc/systemd/system/proxy-panel.service << 'SERVICE'
[Unit]
Description=Proxy Management Panel
After=network.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/proxy-panel/proxy-panel.py
WorkingDirectory=/opt/proxy-panel
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable proxy-panel >/dev/null 2>&1
systemctl restart proxy-panel >/dev/null 2>&1
log_msg "Panel service installed and started"

# ─── Configure Firewall ──────────────────────────────────────────────────────

if command -v ufw &>/dev/null; then
    ufw allow "$PANEL_PORT/tcp" >/dev/null 2>&1 || true
    log_msg "Firewall port $PANEL_PORT opened"
fi

# ─── Get Server IP ────────────────────────────────────────────────────────────

SERVER_IP=""
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}') || true
if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null) || true
fi

# ─── Done ─────────────────────────────────────────────────────────────────────

log_msg "Panel installation complete!"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Proxy Management Panel installed successfully!"
echo ""
echo "  Panel URL:  https://${SERVER_IP:-YOUR_SERVER_IP}:${PANEL_PORT}"
echo "  Login with your server root credentials"
echo ""
echo "  Note: Your browser will show a certificate warning."
echo "        This is expected (self-signed certificate)."
echo "        Click 'Advanced' -> 'Proceed' to continue."
echo "════════════════════════════════════════════════════════════════"
echo ""
