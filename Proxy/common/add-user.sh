#!/bin/bash
set -euo pipefail

# ============================================
# SSH SOCKS Proxy - Add User Script
# Secure user creation with validation
# ============================================

SCRIPT_VERSION="2.0.0"
LOG_FILE="/var/log/ssh-proxy.log"
SSHD_CONFIG="/etc/ssh/sshd_config"
USER_SHELL="/usr/sbin/nologin"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Validation function for username
validate_username() {
    local username="$1"
    if ! [[ "$username" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        echo "Error: Username can only contain letters, numbers, dash, and underscore"
        exit 1
    fi
    if [ ${#username} -lt 3 ] || [ ${#username} -gt 32 ]; then
        echo "Error: Username must be between 3 and 32 characters"
        exit 1
    fi
}

# Validation function for password
validate_password() {
    local password="$1"
    if [ ${#password} -lt 8 ]; then
        echo "Error: Password must be at least 8 characters"
        exit 1
    fi
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
    log "=== SSH SOCKS Proxy - Add User v$SCRIPT_VERSION ==="

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo "Error: This script must be run as root"
        exit 1
    fi

    # Get username
    if [ "$#" -eq 2 ]; then
        # Non-interactive mode (for compatibility)
        USERNAME="$1"
        PASSWORD="$2"
        echo "Warning: Passing password via command line is insecure"
        echo "Recommended: Use interactive mode (run without arguments)"
        sleep 2
    elif [ "$#" -eq 1 ]; then
        USERNAME="$1"
        read -sp "Enter password for $USERNAME: " PASSWORD
        echo
        read -sp "Confirm password: " PASSWORD_CONFIRM
        echo
        if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
            echo "Error: Passwords do not match"
            exit 1
        fi
    else
        # Interactive mode
        read -p "Enter username: " USERNAME
        echo ""
        echo "Password requirements:"
        echo "  - Minimum 8 characters"
        echo "  - Note: Password won't be visible while typing (this is normal for security)"
        echo ""
        read -sp "Enter password: " PASSWORD
        echo
        read -sp "Confirm password: " PASSWORD_CONFIRM
        echo
        if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
            echo "Error: Passwords do not match"
            exit 1
        fi
    fi

    # Validate inputs
    validate_username "$USERNAME"
    validate_password "$PASSWORD"

    log "Adding SOCKS-only user: $USERNAME"

    # Backup before changes
    backup_config

    # Create user if not exists
    if ! id "$USERNAME" &>/dev/null; then
        useradd -m -s "$USER_SHELL" "$USERNAME"
        echo "$USERNAME:$PASSWORD" | chpasswd
        log "User $USERNAME created"
        echo "✓ User created"
    else
        echo "$USERNAME:$PASSWORD" | chpasswd
        log "User $USERNAME already exists, password updated"
        echo "✓ User already exists, password updated"
    fi

    # Remove existing Match block for this user (use temp file to avoid sed -i issues)
    sed "/^Match User $USERNAME$/,/^$/d" "$SSHD_CONFIG" > /tmp/sshd_config.tmp
    cp /tmp/sshd_config.tmp "$SSHD_CONFIG"
    rm -f /tmp/sshd_config.tmp

    # Append clean Match block
    cat <<EOF >> "$SSHD_CONFIG"

Match User $USERNAME
    AllowTcpForwarding yes
    X11Forwarding no
    PermitTunnel no
    PermitTTY no
    ForceCommand /usr/bin/true
EOF

    # Validate SSH config
    if ! sshd -t; then
        log "ERROR: Invalid SSH configuration, restoring backup"
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

    # Add iptables accounting for bandwidth tracking (legacy chain)
    iptables -N "PROXY_USER_${USERNAME}" 2>/dev/null || true
    iptables -C OUTPUT -m owner --uid-owner "$USERNAME" -j "PROXY_USER_${USERNAME}" 2>/dev/null || \
        iptables -A OUTPUT -m owner --uid-owner "$USERNAME" -j "PROXY_USER_${USERNAME}" 2>/dev/null || true

    # Per-user upload/download accounting via connmark (mangle table)
    USER_UID="$(id -u "$USERNAME" 2>/dev/null || true)"
    if [ -n "$USER_UID" ]; then
        iptables -t mangle -N "PROXY_USER_${USERNAME}_OUT" 2>/dev/null || true
        iptables -t mangle -N "PROXY_USER_${USERNAME}_IN" 2>/dev/null || true

        iptables -t mangle -C OUTPUT -m owner --uid-owner "$USERNAME" -j "PROXY_USER_${USERNAME}_OUT" 2>/dev/null || \
            iptables -t mangle -A OUTPUT -m owner --uid-owner "$USERNAME" -j "PROXY_USER_${USERNAME}_OUT" 2>/dev/null || true
        iptables -t mangle -C INPUT -m connmark --mark "$USER_UID" -j "PROXY_USER_${USERNAME}_IN" 2>/dev/null || \
            iptables -t mangle -A INPUT -m connmark --mark "$USER_UID" -j "PROXY_USER_${USERNAME}_IN" 2>/dev/null || true

        iptables -t mangle -C "PROXY_USER_${USERNAME}_OUT" -m owner --uid-owner "$USERNAME" -j CONNMARK --set-mark "$USER_UID" 2>/dev/null || \
            iptables -t mangle -A "PROXY_USER_${USERNAME}_OUT" -m owner --uid-owner "$USERNAME" -j CONNMARK --set-mark "$USER_UID" 2>/dev/null || true
        iptables -t mangle -C "PROXY_USER_${USERNAME}_OUT" -j RETURN 2>/dev/null || \
            iptables -t mangle -A "PROXY_USER_${USERNAME}_OUT" -j RETURN 2>/dev/null || true

        iptables -t mangle -C "PROXY_USER_${USERNAME}_IN" -m connmark --mark "$USER_UID" -j RETURN 2>/dev/null || \
            iptables -t mangle -A "PROXY_USER_${USERNAME}_IN" -m connmark --mark "$USER_UID" -j RETURN 2>/dev/null || true
    fi

    log "User $USERNAME added successfully"

    # Save user info
    mkdir -p /root/proxy-users
    cat > "/root/proxy-users/$USERNAME.txt" <<EOF
Username: $USERNAME
Password: $PASSWORD
Created: $(date)
Type: SSH SOCKS Proxy
Status: Active
EOF
    chmod 600 "/root/proxy-users/$USERNAME.txt"

    echo ""
    echo "======================================"
    echo " ✓ SOCKS-only user '$USERNAME' ready"
    echo "======================================"
    echo ""
    echo "Connection command:"
    echo "  ssh -p PORT -D 1080 $USERNAME@YOUR_SERVER_IP"
    echo ""
    echo "Replace PORT with 22, 443, or your configured port"
    echo ""
}

# Run main function
main "$@"
