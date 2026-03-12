#!/bin/bash
set -euo pipefail

# ============================================
# SSH SOCKS Proxy - Delete User Script
# Secure user deletion with validation
# ============================================

SCRIPT_VERSION="2.0.0"
LOG_FILE="/var/log/ssh-proxy.log"
SSHD_CONFIG="/etc/ssh/sshd_config"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Backup configuration (use /tmp/ to avoid read-only filesystem errors)
BACKUP_FILE=""
backup_config() {
    BACKUP_FILE="/tmp/sshd_config.backup-$(date +%s)"
    cp "$SSHD_CONFIG" "$BACKUP_FILE"
    log "Configuration backed up to $BACKUP_FILE"
}

# Main script
main() {
    log "=== SSH SOCKS Proxy - Delete User v$SCRIPT_VERSION ==="

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo "Error: This script must be run as root"
        exit 1
    fi

    if [ "$#" -ne 1 ]; then
        echo "Usage: delete-user.sh <username>"
        exit 1
    fi

    USERNAME="$1"

    # Validate username
    if ! [[ "$USERNAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        echo "Error: Invalid username format"
        exit 1
    fi

    log "Deleting user: $USERNAME"

    # Check user exists
    if ! id "$USERNAME" &>/dev/null; then
        echo "User $USERNAME does not exist"
        exit 0
    fi

    # Backup before changes
    backup_config

    echo "Killing active sessions for $USERNAME..."
    pkill -u "$USERNAME" || true

    # Wait for processes to terminate gracefully
    sleep 2

    # Force kill if still running
    pkill -9 -u "$USERNAME" || true
    sleep 1

    echo "Removing user account..."
    userdel -r "$USERNAME" 2>/dev/null || deluser --remove-home "$USERNAME" 2>/dev/null || {
        log "WARN: Could not remove system user $USERNAME, continuing with config cleanup"
    }

    # Remove Match block for this user (use temp file to avoid sed -i issues)
    sed "/^Match User $USERNAME$/,/^$/d" "$SSHD_CONFIG" > /tmp/sshd_config.tmp
    cp /tmp/sshd_config.tmp "$SSHD_CONFIG"
    rm -f /tmp/sshd_config.tmp

    # Validate SSH config
    if ! sshd -t; then
        log "ERROR: Invalid SSH configuration after deletion"
        cp "$BACKUP_FILE" "$SSHD_CONFIG" 2>/dev/null || true
        echo "Error: SSH configuration validation failed, changes reverted"
        exit 1
    fi

    # Restart SSH
    systemctl restart ssh

    # Verify SSH is running
    if ! systemctl is-active --quiet ssh; then
        log "ERROR: SSH failed to start"
        echo "Error: SSH failed to start, check logs with: journalctl -xe -u ssh"
        exit 1
    fi

    # Remove iptables accounting chain (legacy)
    iptables -D OUTPUT -m owner --uid-owner "$USERNAME" -j "PROXY_USER_${USERNAME}" 2>/dev/null || true
    iptables -D INPUT -m state --state ESTABLISHED,RELATED -j "PROXY_USER_${USERNAME}" 2>/dev/null || true
    iptables -F "PROXY_USER_${USERNAME}" 2>/dev/null || true
    iptables -X "PROXY_USER_${USERNAME}" 2>/dev/null || true

    # Remove per-user connmark rules (mangle table)
    USER_UID="$(id -u "$USERNAME" 2>/dev/null || true)"
    if [ -n "$USER_UID" ]; then
        iptables -t mangle -D OUTPUT -m owner --uid-owner "$USERNAME" -j "PROXY_USER_${USERNAME}_OUT" 2>/dev/null || true
        iptables -t mangle -D INPUT -m connmark --mark "$USER_UID" -j "PROXY_USER_${USERNAME}_IN" 2>/dev/null || true
    fi
    iptables -t mangle -F "PROXY_USER_${USERNAME}_OUT" 2>/dev/null || true
    iptables -t mangle -X "PROXY_USER_${USERNAME}_OUT" 2>/dev/null || true
    iptables -t mangle -F "PROXY_USER_${USERNAME}_IN" 2>/dev/null || true
    iptables -t mangle -X "PROXY_USER_${USERNAME}_IN" 2>/dev/null || true

    # Remove user info file
    rm -f "/root/proxy-users/$USERNAME.txt"

    log "User $USERNAME deleted successfully"

    echo ""
    echo "======================================"
    echo " ✓ User '$USERNAME' deleted"
    echo "======================================"
    echo ""
}

# Run main function
main "$@"
