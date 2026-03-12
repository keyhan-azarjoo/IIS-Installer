#!/bin/bash
set -euo pipefail

# ============================================
# V2Ray VLESS Real Domain - Add User Script (gRPC + REAL TLS)
# ============================================

CONFIG="/usr/local/etc/xray/config.json"
USER_DB="/usr/local/etc/xray/users.json"
SERVER_CONFIG="/usr/local/etc/xray/server-config.json"
LOG_FILE="/var/log/ssh-proxy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "Installing jq..."
    apt update -y && apt install -y jq
fi

if [ ! -f "$SERVER_CONFIG" ]; then
    echo "Error: Server config not found. Run install.sh first."
    exit 1
fi

if [ "$#" -eq 1 ]; then
    USERNAME="$1"
elif [ "$#" -eq 0 ]; then
    read -p "Enter username: " USERNAME
else
    echo "Usage: add-user.sh [username]"
    exit 1
fi

if ! [[ "$USERNAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: Username can only contain letters, numbers, dash, underscore"
    exit 1
fi

log "Adding VLESS user: $USERNAME"

if [ ! -f "$USER_DB" ]; then
    echo "{}" > "$USER_DB"
fi

if jq -e --arg u "$USERNAME" '.[$u]' "$USER_DB" >/dev/null 2>&1; then
    UUID=$(jq -r --arg u "$USERNAME" '.[$u]' "$USER_DB")
    EXISTING=true
    echo "User '$USERNAME' already exists - returning same config"
else
    UUID=$(cat /proc/sys/kernel/random/uuid)

    jq --arg u "$USERNAME" --arg id "$UUID" '. + {($u): $id}' "$USER_DB" > /tmp/users.json
    mv /tmp/users.json "$USER_DB"

    jq --arg uuid "$UUID" --arg email "${USERNAME}@proxy" \
      '.inbounds[0].settings.clients += [{"id":$uuid,"email":$email}]' \
      "$CONFIG" > /tmp/xray.json
    mv /tmp/xray.json "$CONFIG"

    systemctl restart xray

    sleep 2
    if ! systemctl is-active --quiet xray; then
        log "ERROR: Xray failed to restart after adding user"
        echo "Error: Xray failed to restart"
        exit 1
    fi

    EXISTING=false
    log "User $USERNAME added successfully"
fi

DOMAIN=$(jq -r '.domain' "$SERVER_CONFIG")
GRPC_SERVICE=$(jq -r '.grpc_service' "$SERVER_CONFIG")
SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
echo "======================================"
echo " User: $USERNAME"
echo " UUID: $UUID"
if [ "$EXISTING" = true ]; then
    echo " Status: Existing user"
else
    echo " Status: New user created"
fi
echo "======================================"
echo ""
echo "VLESS gRPC + REAL TLS"
echo "Domain: $DOMAIN"
echo "gRPC Service: $GRPC_SERVICE"
echo ""

cat <<EOF
{
  "inbounds": [],
  "outbounds": [{
    "protocol": "vless",
    "settings": {
      "vnext": [{
        "address": "$DOMAIN",
        "port": 443,
        "users": [{"id": "$UUID", "encryption": "none"}]
      }]
    },
    "streamSettings": {
      "network": "grpc",
      "security": "tls",
      "tlsSettings": {"serverName": "$DOMAIN", "allowInsecure": false, "alpn": ["h2"]},
      "grpcSettings": {"serviceName": "$GRPC_SERVICE"}
    }
  }]
}
EOF

echo ""
echo "--------------------------------------"
echo "Quick Connect String:"
echo "vless://$UUID@$DOMAIN:443?type=grpc&security=tls&serviceName=$GRPC_SERVICE&sni=$DOMAIN#$USERNAME"
echo ""

echo "Local SOCKS (Android/NetMod) sample:"
cat <<EOF
{
  "inbounds": [{
    "port": 10808,
    "listen": "127.0.0.1",
    "protocol": "socks",
    "settings": {"udp": true}
  }],
  "outbounds": [{
    "protocol": "vless",
    "settings": {
      "vnext": [{
        "address": "$DOMAIN",
        "port": 443,
        "users": [{"id": "$UUID", "encryption": "none"}]
      }]
    },
    "streamSettings": {
      "network": "grpc",
      "security": "tls",
      "tlsSettings": {"serverName": "$DOMAIN", "allowInsecure": false, "alpn": ["h2"]},
      "grpcSettings": {"serviceName": "$GRPC_SERVICE"}
    }
  }]
}
EOF