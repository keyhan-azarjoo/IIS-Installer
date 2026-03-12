#!/bin/bash
set -euo pipefail

# ============================================
# V2Ray VLESS Real Domain - Delete User Script
# Remove user from VLESS configuration
# ============================================

CONFIG="/usr/local/etc/xray/config.json"
USER_DB="/usr/local/etc/xray/users.json"
LOG_FILE="/var/log/ssh-proxy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

# Check if jq is installed
if ! command -v jq >/dev/null 2>&1; then
    echo "Installing jq..."
    apt update -y && apt install -y jq
fi

# Get username
if [ "$#" -eq 1 ]; then
    USERNAME="$1"
elif [ "$#" -eq 0 ]; then
    read -p "Enter username to delete: " USERNAME
else
    echo "Usage: delete-user.sh [username]"
    exit 1
fi

# Validate username
if ! [[ "$USERNAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: Invalid username format"
    exit 1
fi

log "Deleting VLESS user: $USERNAME"

# Check if user database exists
if [ ! -f "$USER_DB" ]; then
    echo "Error: User database not found"
    exit 1
fi

# Check if user exists
if ! jq -e --arg u "$USERNAME" '.[$u]' "$USER_DB" >/dev/null 2>&1; then
    echo "Error: User '$USERNAME' not found"
    exit 1
fi

# Get user UUID
UUID=$(jq -r --arg u "$USERNAME" '.[$u]' "$USER_DB")

# Remove user from database
jq --arg u "$USERNAME" 'del(.[$u])' "$USER_DB" > /tmp/users.json
mv /tmp/users.json "$USER_DB"

# Remove user from Xray config
jq --arg uuid "$UUID" \
  '.inbounds[0].settings.clients = [.inbounds[0].settings.clients[] | select(.id != $uuid)]' \
  "$CONFIG" > /tmp/xray.json
mv /tmp/xray.json "$CONFIG"

# Restart Xray
systemctl restart xray

# Verify Xray is running
sleep 2
if ! systemctl is-active --quiet xray; then
    log "ERROR: Xray failed to restart after deleting user"
    echo "Error: Xray failed to restart"
    exit 1
fi

log "User $USERNAME deleted successfully"

echo ""
echo "======================================"
echo " User '$USERNAME' deleted"
echo "======================================"
echo ""
echo "The user can no longer connect with their previous config."
echo ""
