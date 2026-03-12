#!/bin/bash
set -euo pipefail

# ============================================
# Layer 7: Iran-Optimized gRPC + REAL TLS (VLESS)
#
# Tuned for Iranian ISP DPI/throttling:
#   - gRPC keepalive (survives idle connection kills)
#   - TLS fingerprint normalization (Chrome/Android)
#   - Policy tuning (smaller buffers, shorter idles)
#   - Stats API enabled for monitoring
# ============================================

SCRIPT_VERSION="2.2.0-iran"
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

    if ss -tulpn | grep -q ":80 "; then
        echo "Warning: Port 80 in use. Certbot needs it."
    fi

    log "Pre-flight checks passed"
}

main() {
    echo "============================================"
    echo " Layer 7: Iran-Optimized gRPC + REAL TLS"
    echo " Version: $SCRIPT_VERSION"
    echo "============================================"
    echo ""
    echo "This will:"
    echo "  - Install Xray (V2Ray core)"
    echo "  - Configure VLESS protocol"
    echo "  - Enable gRPC transport with keepalive tuning"
    echo "  - Get a REAL TLS certificate (Let's Encrypt)"
    echo "  - Apply Iran DPI/throttling countermeasures"
    echo "  - Enable stats API for monitoring"
    echo ""
    echo "Iran-specific tuning:"
    echo "  - gRPC keepalive pings (prevents idle kill)"
    echo "  - TLS 1.2-1.3 + h2 ALPN (Chrome/Android fingerprint)"
    echo "  - Small buffers (survives packet loss)"
    echo "  - Short idle timeouts (avoids flow analysis)"
    echo ""

    read -p "Enter your domain (FQDN): " DOMAIN
    read -p "Enter email for Let's Encrypt: " EMAIL

    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        echo "Error: domain and email are required"
        exit 1
    fi

    DUCKDNS_TOKEN=""
    DUCKDNS_SUBDOMAIN=""
    if [[ "$DOMAIN" == *.duckdns.org ]]; then
        DUCKDNS_SUBDOMAIN="${DOMAIN%.duckdns.org}"
        echo ""
        echo "DuckDNS domain detected: $DOMAIN"
        read -p "Enter your DuckDNS token (leave empty to skip): " DUCKDNS_TOKEN
        if [ -z "$DUCKDNS_TOKEN" ]; then
            echo "Warning: No DuckDNS token provided. Skipping automatic DNS update."
        fi
    fi

    preflight_check

    log "=== Starting Iran-Optimized Layer 7 installation ==="

    echo "Removing conflicting services..."
    systemctl stop stunnel4 2>/dev/null || true
    systemctl disable stunnel4 2>/dev/null || true
    apt purge -y stunnel4 2>/dev/null || true
    rm -rf /etc/stunnel

    for svc in nginx apache2 httpd plesk psa sw-cp-server sw-engine; do
        systemctl stop "$svc" 2>/dev/null || true
        systemctl disable "$svc" 2>/dev/null || true
        systemctl mask "$svc" 2>/dev/null || true
    done
    log "Conflicting services removed"

    echo "Installing dependencies..."
    apt update -y
    apt install -y curl unzip openssl ufw jq certbot
    log "Dependencies installed"

    if [ -n "$DUCKDNS_TOKEN" ]; then
        echo "Updating DuckDNS DNS record..."
        DUCKDNS_RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=${DUCKDNS_SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=")
        if [ "$DUCKDNS_RESPONSE" = "OK" ]; then
            log "DuckDNS DNS updated successfully"
        else
            log "WARNING: DuckDNS update failed (response: $DUCKDNS_RESPONSE)"
            echo "Warning: DuckDNS update failed. Make sure your token is correct."
            echo "Continuing anyway..."
        fi

        echo "Setting up DuckDNS auto-update cron job..."
        CRON_CMD="*/5 * * * * curl -fs \"https://www.duckdns.org/update?domains=${DUCKDNS_SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=\" >/dev/null"
        (crontab -l 2>/dev/null | grep -v "duckdns.org/update" || true; echo "$CRON_CMD") | crontab -
        log "DuckDNS auto-update cron job configured (every 5 minutes)"
    fi

    echo "Configuring firewall..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    log "Firewall configured"

    echo "Installing Xray..."
    bash <(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh) || {
        log "ERROR: Xray installation failed"
        exit 1
    }
    log "Xray installed"

    echo "Requesting TLS certificate..."
    certbot certonly --standalone \
      -d "$DOMAIN" \
      --non-interactive \
      --agree-tos \
      -m "$EMAIL" || {
        log "ERROR: Certbot failed"
        exit 1
    }

    systemctl enable --now certbot.timer 2>/dev/null || true
    log "TLS certificate issued"

    GRPC_SERVICE="grpc$(cat /proc/sys/kernel/random/uuid | cut -d'-' -f1)"

    mkdir -p /etc/xray/certs
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" /etc/xray/certs/cert.pem
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" /etc/xray/certs/private.key

    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    cat > /etc/letsencrypt/renewal-hooks/deploy/xray-certs.sh <<HOOK
#!/bin/bash
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" /etc/xray/certs/cert.pem
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" /etc/xray/certs/private.key
chown nobody:nogroup /etc/xray/certs/cert.pem /etc/xray/certs/private.key
chmod 644 /etc/xray/certs/cert.pem /etc/xray/certs/private.key
systemctl restart xray
HOOK
    chmod 755 /etc/letsencrypt/renewal-hooks/deploy/xray-certs.sh

    chmod 755 /usr /usr/local /usr/local/etc
    mkdir -p /usr/local/etc/xray
    chmod 755 /usr/local/etc/xray

    chown -R nobody:nogroup /etc/xray /usr/local/etc/xray
    chmod 644 /etc/xray/certs/cert.pem /etc/xray/certs/private.key

    echo "Configuring Xray (Iran-optimized)..."
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
      "protocol": "vless",
      "settings": {
        "clients": [],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "grpc",
        "security": "tls",
        "tlsSettings": {
          "alpn": ["h2"],
          "minVersion": "1.2",
          "maxVersion": "1.3",
          "certificates": [
            {
              "certificateFile": "/etc/xray/certs/cert.pem",
              "keyFile": "/etc/xray/certs/private.key"
            }
          ]
        },
        "grpcSettings": {
          "serviceName": "$GRPC_SERVICE",
          "idle_timeout": 60,
          "health_check_timeout": 20,
          "permit_without_stream": true,
          "initial_windows_size": 1048576
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

    mkdir -p /usr/local/etc/xray
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
                  '.inbounds[0].settings.clients += [{"id":$uuid,"email":$email}]' \
                  /usr/local/etc/xray/config.json > /tmp/xray.json && mv /tmp/xray.json /usr/local/etc/xray/config.json
                log "Restored user: $username"
            fi
        done
    fi

    if [ -n "$DUCKDNS_TOKEN" ]; then
        cat > /usr/local/etc/xray/server-config.json <<EOF
{
  "domain": "$DOMAIN",
  "grpc_service": "$GRPC_SERVICE",
  "protocol": "vless",
  "duckdns_token": "$DUCKDNS_TOKEN",
  "duckdns_subdomain": "$DUCKDNS_SUBDOMAIN"
}
EOF
    else
        cat > /usr/local/etc/xray/server-config.json <<EOF
{
  "domain": "$DOMAIN",
  "grpc_service": "$GRPC_SERVICE",
  "protocol": "vless"
}
EOF
    fi
    chmod 644 /usr/local/etc/xray/server-config.json

    log "Xray configured (Iran-optimized)"

    mkdir -p /etc/systemd/system/xray.service.d
    cat > /etc/systemd/system/xray.service.d/override.conf <<OVERRIDE
[Service]
ReadOnlyPaths=/etc/xray/certs
OVERRIDE

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

    SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "Unknown")
    cat > /root/proxy-installation-info.txt <<EOF
Installation Details
====================
Date: $(date)
Layer: 7 (Iran-Optimized gRPC + REAL TLS)
Port: 443
Protocol: VLESS + gRPC + REAL TLS (Iran-tuned)
Script Version: $SCRIPT_VERSION

Domain: $DOMAIN
Server IP: $SERVER_IP
gRPC Service: $GRPC_SERVICE

Iran Tuning Applied:
  gRPC keepalive: idle_timeout=60, health_check=20
  TLS: 1.2-1.3, ALPN=h2
  Policy: bufferSize=16, connIdle=60
  Stats API: enabled on 127.0.0.1:10085

Config Location: /usr/local/etc/xray/config.json
Users Database: /usr/local/etc/xray/users.json
Server Config: /usr/local/etc/xray/server-config.json
EOF

    if [ -n "$DUCKDNS_TOKEN" ]; then
        cat >> /root/proxy-installation-info.txt <<EOF

DuckDNS Subdomain: $DUCKDNS_SUBDOMAIN
DuckDNS Auto-Update: Enabled (cron every 5 minutes)
EOF
    fi

    touch "$LOG_FILE"

    log "=== Iran-Optimized Layer 7 installation completed ==="

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


    if [ "${PROXY_SKIP_PANEL_INSTALL:-0}" = "1" ]; then
        log "Skipping panel install; handled by the outer Proxy installer."
    else
        log "Installing management panel..."
        if [ -n "${PROXY_REPO_ROOT:-}" ] && [ -f "${PROXY_REPO_ROOT}/panel/install-panel.sh" ]; then
            bash "${PROXY_REPO_ROOT}/panel/install-panel.sh" "--layer=layer7-iran-optimized" "--repo-root=${PROXY_REPO_ROOT}" || log "WARN: Panel installation failed (non-critical)"
        else
            PANEL_SCRIPT_URL="https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/panel/install-panel.sh"
            curl -fsSL "$PANEL_SCRIPT_URL" -o /tmp/install-panel.sh && bash /tmp/install-panel.sh --layer=layer7-iran-optimized || log "WARN: Panel installation failed (non-critical)"
            rm -f /tmp/install-panel.sh
        fi
    fi

    echo ""
    echo "============================================"
    echo " Installation Complete! (Iran-Optimized)"
    echo "============================================"
    echo ""
    echo "V2Ray VLESS is now active on port 443"
    echo ""
    echo "Domain: $DOMAIN"
    echo "Server IP: $SERVER_IP"
    echo "Port: 443"
    echo "Protocol: VLESS + gRPC + REAL TLS (Iran-tuned)"
    echo "gRPC Service: $GRPC_SERVICE"
    echo ""
    echo "Iran tuning applied:"
    echo "  gRPC keepalive: idle=60s, health_check=20s"
    echo "  TLS: 1.2-1.3 only, ALPN=h2"
    echo "  Buffers: 16KB (packet-loss friendly)"
    echo "  Stats API: 127.0.0.1:10085"
    echo ""
    if [ -n "$DUCKDNS_TOKEN" ]; then
        echo "DuckDNS Auto-Update: Enabled (every 5 minutes)"
        echo ""
    fi
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
    echo "  Add user:    curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-iran-optimized/add-user.sh -o add-user.sh && bash add-user.sh"
    echo "  Delete user: curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-iran-optimized/delete-user.sh -o delete-user.sh && bash delete-user.sh <username>"
    echo "  Status:      systemctl status xray"
    echo "  Stats:       xray api statsquery --server=127.0.0.1:10085 -pattern=''"
    echo ""
    echo "============================================"
}

trap 'log "ERROR: Installation failed at line $LINENO"; exit 1' ERR
main "$@"
