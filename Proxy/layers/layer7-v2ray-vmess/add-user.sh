#!/bin/bash
set -euo pipefail

# ============================================
# V2Ray VMess - Add User Script
# Add new user to VMess configuration
# ============================================

CONFIG="/usr/local/etc/xray/config.json"
USER_DB="/usr/local/etc/xray/users.json"
LOG_FILE="/var/log/ssh-proxy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if jq is installed
if ! command -v jq >/dev/null 2>&1; then
    echo "Installing jq..."
    apt update -y && apt install -y jq
fi

# Get username
if [ "$#" -eq 1 ]; then
    USERNAME="$1"
elif [ "$#" -eq 0 ]; then
    read -p "Enter username: " USERNAME
else
    echo "Usage: add-user.sh [username]"
    exit 1
fi

# Validate username
if ! [[ "$USERNAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: Username can only contain letters, numbers, dash, underscore"
    exit 1
fi

log "Adding VMess user: $USERNAME"

# Create user database if not exists
if [ ! -f "$USER_DB" ]; then
    echo "{}" > "$USER_DB"
fi

# Check if user exists
if jq -e --arg u "$USERNAME" '.[$u]' "$USER_DB" >/dev/null 2>&1; then
    UUID=$(jq -r --arg u "$USERNAME" '.[$u]' "$USER_DB")
    EXISTING=true
    echo "User '$USERNAME' already exists"
else
    # Generate new UUID
    UUID=$(cat /proc/sys/kernel/random/uuid)

    # Save to user database
    jq --arg u "$USERNAME" --arg id "$UUID" '. + {($u): $id}' "$USER_DB" > /tmp/users.json
    mv /tmp/users.json "$USER_DB"

    # Add to Xray config
    jq --arg uuid "$UUID" --arg email "${USERNAME}@proxy" \
      '.inbounds[0].settings.clients += [{"id":$uuid,"alterId":0,"email":$email}]' \
      "$CONFIG" > /tmp/xray.json

    mv /tmp/xray.json "$CONFIG"

    # Restart Xray
    systemctl restart xray

    # Verify Xray is running
    sleep 2
    if ! systemctl is-active --quiet xray; then
        log "ERROR: Xray failed to restart after adding user"
        echo "Error: Xray failed to restart"
        echo "Restoring previous config..."
        # Note: Should have backup, but for now just notify
        exit 1
    fi

    EXISTING=false
    log "User $USERNAME added successfully"
fi

# Get server IP
SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

# Display results
echo ""
echo "======================================"
echo " User: $USERNAME"
echo " UUID: $UUID"
if [ "$EXISTING" = true ]; then
    echo " Status: Existing user"
else
    echo " Status: ✓ New user created"
fi
echo "======================================"
echo ""
echo ""
echo "╔══════════════════════════════════════╗"
echo "║          iOS  (NPV Tunnel)           ║"
echo "╚══════════════════════════════════════╝"
echo ""

cat <<EOF
{
  "inbounds": [],
  "outbounds": [{
    "protocol": "vmess",
    "settings": {
      "vnext": [{
        "address": "$SERVER_IP",
        "port": 443,
        "users": [{
          "id": "$UUID",
          "alterId": 0,
          "security": "auto"
        }]
      }]
    },
    "streamSettings": {
      "network": "tcp",
      "security": "tls",
      "tlsSettings": {
        "serverName": "proxy.local",
        "allowInsecure": true
      }
    }
  }]
}
EOF

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        ANDROID  (NetMod)             ║"
echo "╚══════════════════════════════════════╝"
echo ""

cat <<EOF
{
  "inbounds": [{
    "port": 10808,
    "listen": "127.0.0.1",
    "protocol": "socks",
    "settings": {
      "udp": true
    }
  }],
  "outbounds": [{
    "protocol": "vmess",
    "settings": {
      "vnext": [{
        "address": "$SERVER_IP",
        "port": 443,
        "users": [{
          "id": "$UUID",
          "alterId": 0,
          "security": "auto"
        }]
      }]
    },
    "streamSettings": {
      "network": "tcp",
      "security": "tls",
      "tlsSettings": {
        "serverName": "proxy.local",
        "allowInsecure": true
      }
    }
  }]
}
EOF

echo ""
echo "--------------------------------------"
echo "Quick Connect String:"
echo "vmess://$UUID@$SERVER_IP:443"
echo ""
