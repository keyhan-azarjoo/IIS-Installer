#!/bin/bash
set -euo pipefail

# ============================================
# Layer 7: V2Ray VMess + TCP + TLS
# VMess protocol with multi-user support
# ============================================

SCRIPT_VERSION="2.0.0"
LOG_FILE="/var/log/ssh-proxy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}


port_in_use() {
    local port="$1"
    ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "(^|:)$port$"
}

disable_plesk() {
    if ! command -v systemctl >/dev/null 2>&1; then
        return 1
    fi
    if systemctl list-unit-files 2>/dev/null | grep -qE '^(sw-cp-server|sw-engine|plesk)\.service'; then
        log "Plesk detected. Disabling to free port 8443..."
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
            log "Proxy panel is running. Stopping it to free port 8443..."
            systemctl stop proxy-panel >/dev/null 2>&1 || true
            sleep 2
            return 0
        fi
    fi
    return 1
}


preflight_check() {
    log "Running pre-flight checks..."

    if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
        echo "Warning: Designed for Ubuntu, continuing anyway..."
    fi

    [ "$EUID" -ne 0 ] && { echo "Error: Run as root"; exit 1; }

    AVAILABLE=$(df / | tail -1 | awk '{print $4}')
    [ "$AVAILABLE" -lt 1048576 ] && { echo "Error: Need 1GB+ disk space"; exit 1; }

    if ss -tulpn | grep -q ":443 "; then
        echo "Warning: Port 443 in use. Will be freed."
    fi

    log "Pre-flight checks passed"
}

main() {
    echo "============================================"
    echo " Layer 7: V2Ray VMess + TCP + TLS"
    echo " Version: $SCRIPT_VERSION"
    echo "============================================"
    echo ""
    echo "This will:"
    echo "  • Install Xray (V2Ray core)"
    echo "  • Configure VMess protocol"
    echo "  • Enable TCP + TLS transport"
    echo "  • Support multiple users"
    echo "  • Use port 443 (HTTPS)"
    echo ""
    echo "VMess provides better multi-user management"
    echo ""

    preflight_check

    log "=== Starting Layer 7 VMess installation ==="

    # Remove conflicting services
    echo ""
    echo "Removing conflicting services..."
    systemctl stop stunnel4 2>/dev/null || true
    apt purge -y stunnel4 2>/dev/null || true
    rm -rf /etc/stunnel

    for svc in nginx apache2 httpd plesk psa sw-cp-server sw-engine; do
        systemctl stop "$svc" 2>/dev/null || true
        systemctl disable "$svc" 2>/dev/null || true
        systemctl mask "$svc" 2>/dev/null || true
    done
    log "Conflicting services removed"

    # Install dependencies
    echo ""
    echo "Installing dependencies..."
    apt update -y
    apt install -y curl unzip openssl ufw jq
    log "Dependencies installed"

    # Install Xray
    echo "Installing Xray..."
    bash <(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh) || {
        log "ERROR: Xray installation failed"
        exit 1
    }
    log "Xray installed"

    # Create certificate
    echo "Creating TLS certificate..."
    mkdir -p /etc/xray/certs

    openssl req -new -x509 -nodes -days 3650 \
      -keyout /etc/xray/certs/private.key \
      -out /etc/xray/certs/cert.pem \
      -subj "/C=XX/ST=Self/L=Self/O=PrivateProxy/CN=proxy.local"

    # Fix permissions
    chmod 755 /usr /usr/local /usr/local/etc
    mkdir -p /usr/local/etc/xray
    chmod 755 /usr/local/etc/xray

    chown -R nobody:nogroup /etc/xray /usr/local/etc/xray
    chmod 644 /etc/xray/certs/cert.pem /etc/xray/certs/private.key

    log "Certificate created"

    # Create Xray config for VMess
    echo "Configuring Xray..."
cat > /usr/local/etc/xray/config.json <<EOF
{
  "log": {
    "loglevel": "warning"
  },
  "stats": {},
  "api": {
    "tag": "api",
    "services": ["StatsService"]
  },
  "policy": {
    "levels": {
      "0": {
        "handshake": 10,
        "connIdle": 60,
        "uplinkOnly": 2,
        "downlinkOnly": 5,
        "bufferSize": 16,
        "statsUserUplink": true,
        "statsUserDownlink": true
      }
    },
    "system": {
      "statsInboundUplink": true,
      "statsInboundDownlink": true
    }
  },
  "inbounds": [
    {
      "listen": "0.0.0.0",
      "port": 443,
      "protocol": "vmess",
      "settings": {
        "clients": []
      },
      "streamSettings": {
        "network": "tcp",
        "security": "tls",
        "tlsSettings": {
          "certificates": [
            {
              "certificateFile": "/etc/xray/certs/cert.pem",
              "keyFile": "/etc/xray/certs/private.key"
            }
          ]
        }
      }
    },
    {
      "listen": "127.0.0.1",
      "port": 10085,
      "protocol": "dokodemo-door",
      "settings": {
        "address": "127.0.0.1"
      },
      "tag": "api"
    }
  ],
  "outbounds": [
    { "protocol": "freedom" }
  ],
  "routing": {
    "rules": [
      {
        "inboundTag": ["api"],
        "outboundTag": "api",
        "type": "field"
      }
    ]
  }
}
EOF

    chown nobody:nogroup /usr/local/etc/xray/config.json
    chmod 644 /usr/local/etc/xray/config.json

    # Restore or create user database
    if [ -f /root/proxy-users/xray-users.json ]; then
        cp /root/proxy-users/xray-users.json /usr/local/etc/xray/users.json
        log "Restored previous user database from /root/proxy-users/xray-users.json"
    else
        echo "{}" > /usr/local/etc/xray/users.json
    fi
    chmod 644 /usr/local/etc/xray/users.json

    # Re-add restored users to xray config
    if command -v jq >/dev/null 2>&1; then
        for username in $(jq -r 'keys[]' /usr/local/etc/xray/users.json 2>/dev/null); do
            uuid=$(jq -r --arg u "$username" '.[$u]' /usr/local/etc/xray/users.json)
            if [ -n "$uuid" ] && [ "$uuid" != "null" ]; then
                jq --arg uuid "$uuid" --arg email "${username}@proxy" \
                  '.inbounds[0].settings.clients += [{"id":$uuid,"alterId":0,"email":$email}]' \
                  /usr/local/etc/xray/config.json > /tmp/xray.json && mv /tmp/xray.json /usr/local/etc/xray/config.json
                log "Restored user: $username"
            fi
        done
    fi

    log "Xray configured"

    # Allow Xray (running as nobody) to read certs via systemd override
    mkdir -p /etc/systemd/system/xray.service.d
    cat > /etc/systemd/system/xray.service.d/override.conf <<OVERRIDE
[Service]
ReadOnlyPaths=/etc/xray/certs
OVERRIDE

    # Start Xray
    echo "Starting Xray..."
    systemctl daemon-reexec
    systemctl daemon-reload
    systemctl enable xray
    systemctl restart xray

    sleep 3

    if ! systemctl is-active --quiet xray; then
        log "ERROR: Xray failed to start"
        echo "Error: Xray failed"
        journalctl -xe -u xray --no-pager | tail -30
        exit 1
    fi

    log "Xray started successfully"

    # Firewall
    echo "Configuring firewall..."
    ufw allow 443/tcp
    ufw --force enable
    log "Firewall configured"

    # Save installation info
    SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "Unknown")
    cat > /root/proxy-installation-info.txt <<EOF
Installation Details
====================
Date: $(date)
Layer: 7 (V2Ray VMess)
Port: 443
Protocol: VMess + TCP + TLS
Script Version: $SCRIPT_VERSION

Server IP: $SERVER_IP

Config Location: /usr/local/etc/xray/config.json
Users Database: /usr/local/etc/xray/users.json
EOF

    touch "$LOG_FILE"

    log "=== Layer 7 VMess installation completed ==="

    
    # Ensure panel uses port 8443 (disable Plesk if needed)
    if port_in_use 8443; then
        disable_plesk || true
    fi
    if port_in_use 8443; then
        stop_proxy_panel || true
    fi
    if port_in_use 8443; then
        if proxy_panel_active; then
            log "Port 8443 is already in use by proxy-panel. Continuing..."
        else
            log "ERROR: Port 8443 is in use and could not be freed. Aborting panel install."
            exit 1
        fi
    fi

# Install management panel
    if [ "${PROXY_SKIP_PANEL_INSTALL:-0}" = "1" ]; then
        log "Skipping panel install; handled by the outer Proxy installer."
    else
        log "Installing management panel..."
        if [ -n "${PROXY_REPO_ROOT:-}" ] && [ -f "${PROXY_REPO_ROOT}/panel/install-panel.sh" ]; then
            bash "${PROXY_REPO_ROOT}/panel/install-panel.sh" "--layer=layer7-v2ray-vmess" "--repo-root=${PROXY_REPO_ROOT}" || log "WARN: Panel installation failed (non-critical)"
        else
            PANEL_SCRIPT_URL="https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/panel/install-panel.sh"
            curl -fsSL "$PANEL_SCRIPT_URL" -o /tmp/install-panel.sh && bash /tmp/install-panel.sh --layer=layer7-v2ray-vmess || log "WARN: Panel installation failed (non-critical)"
            rm -f /tmp/install-panel.sh
        fi
    fi

    # Final output
    echo ""
    echo "============================================"
    echo " Installation Complete!"
    echo "============================================"
    echo ""
    echo "V2Ray VMess proxy is now active on port 443"
    echo ""
    echo "Server IP: $SERVER_IP"
    echo "Port: 443"
    echo "Protocol: VMess + TCP + TLS"
    echo ""
    echo "Next step: Add a user to get connection config"
    echo ""
    PANEL_PORT=8443
if [ -f /opt/proxy-panel/panel.conf ] && command -v python3 >/dev/null 2>&1; then
    PANEL_PORT=$(python3 - <<'PY'
import json
try:
    with open('/opt/proxy-panel/panel.conf', 'r', encoding='utf-8') as f:
        data = json.load(f)
    port = data.get('port')
    print(port if isinstance(port, int) else '8443')
except Exception:
    print('8443')
PY
)
fi

echo "Management Panel:"
    echo "  URL: https://${SERVER_IP}:${PANEL_PORT}"
    echo "  Login with your server root credentials"
    echo ""
    echo "CLI Management commands:"
    echo "-------------------"
    echo "  Add user:    curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-v2ray-vmess/add-user.sh -o add-user.sh && bash add-user.sh"
    echo "  Delete user: curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-v2ray-vmess/delete-user.sh -o delete-user.sh && bash delete-user.sh <username>"
    echo "  Status:      systemctl status xray"
    echo ""
    echo "============================================"
}

trap 'log "ERROR: Installation failed at line $LINENO"; exit 1' ERR
main "$@"
