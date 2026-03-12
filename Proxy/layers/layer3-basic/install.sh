#!/bin/bash
set -euo pipefail

# ============================================
# Layer 3: Basic SSH SOCKS Proxy (Port 22)
# Simple SSH proxy on default port
# ============================================

SCRIPT_VERSION="2.0.0"
LOG_FILE="/var/log/ssh-proxy.log"
SSHD_CONFIG="/etc/ssh/sshd_config"

# Logging function
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


# Pre-flight checks
preflight_check() {
    log "Running pre-flight checks..."

    # Check OS
    if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
        echo "Warning: This script is designed for Ubuntu"
        echo "Your OS: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || echo 'Unknown')"
        echo "Continuing anyway..."
    fi

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo "Error: This script must be run as root"
        exit 1
    fi

    # Check disk space (require 1GB)
    AVAILABLE=$(df / | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE" -lt 1048576 ]; then
        echo "Error: Less than 1GB disk space available"
        exit 1
    fi

    # Check port 22
    if ! ss -tulpn | grep -q ":22 "; then
        echo "Warning: SSH doesn't appear to be listening on port 22"
    fi

    log "Pre-flight checks passed"
}

# Backup configuration
backup_config() {
    if [ -f "$SSHD_CONFIG" ]; then
        cp "$SSHD_CONFIG" "$SSHD_CONFIG.backup-$(date +%s)"
        log "SSH configuration backed up"
    fi
}

# Main installation
main() {
    echo "============================================"
    echo " Layer 3: Basic SSH SOCKS Proxy"
    echo " Version: $SCRIPT_VERSION"
    echo "============================================"
    echo ""
    echo "This will configure SSH for SOCKS proxy on port 22"
    echo ""

    preflight_check

    echo ""
    echo "Starting installation..."
    log "=== Starting Layer 3 installation ==="

    # Backup before changes
    backup_config

    # Update system
    echo ""
    echo "Updating system packages..."
    apt update && apt upgrade -y
    log "System updated"

    # Install required packages
    echo "Installing SSH server and firewall..."
    apt install -y openssh-server ufw
    log "Packages installed"

    # Configure SSH
    echo "Configuring SSH for SOCKS proxy..."

    # Remove old entries and add new ones
    sed -i '/^#\?AllowTcpForwarding/d' "$SSHD_CONFIG"
    sed -i '/^#\?PermitTunnel/d' "$SSHD_CONFIG"
    sed -i '/^#\?X11Forwarding/d' "$SSHD_CONFIG"

    cat >> "$SSHD_CONFIG" <<'EOF'

# SSH SOCKS Proxy Configuration
AllowTcpForwarding yes
PermitTunnel no
X11Forwarding no
EOF

    # Validate SSH config
    if ! sshd -t; then
        log "ERROR: Invalid SSH configuration"
        echo "Error: SSH configuration validation failed"
        # Restore backup
        cp "$SSHD_CONFIG.backup-"* "$SSHD_CONFIG" 2>/dev/null || true
        exit 1
    fi

    # Restart SSH
    systemctl enable ssh
    systemctl restart ssh

    # Verify SSH is running
    if ! systemctl is-active --quiet ssh; then
        log "ERROR: SSH failed to start"
        echo "Error: SSH service failed to start"
        journalctl -xe -u ssh --no-pager | tail -20
        exit 1
    fi

    log "SSH configured successfully"

    # Configure firewall
    echo "Configuring firewall..."
    ufw allow 22/tcp
    ufw --force enable
    log "Firewall configured"

    # Create log directory
    mkdir -p /root/proxy-users
    touch "$LOG_FILE"

    # Save installation info
    cat > /root/proxy-installation-info.txt <<EOF
Installation Details
====================
Date: $(date)
Layer: 3 (Basic SSH)
Port: 22
Script Version: $SCRIPT_VERSION

Server IP: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "Unable to detect")
EOF

    log "=== Layer 3 installation completed ==="

    
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
            bash "${PROXY_REPO_ROOT}/panel/install-panel.sh" "--layer=layer3-basic" "--repo-root=${PROXY_REPO_ROOT}" || log "WARN: Panel installation failed (non-critical)"
        else
            PANEL_SCRIPT_URL="https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/panel/install-panel.sh"
            curl -fsSL "$PANEL_SCRIPT_URL" -o /tmp/install-panel.sh && bash /tmp/install-panel.sh --layer=layer3-basic || log "WARN: Panel installation failed (non-critical)"
            rm -f /tmp/install-panel.sh
        fi
    fi

    # Final output
    echo ""
    echo "============================================"
    echo " ✓ Installation Complete!"
    echo "============================================"
    echo ""
    echo "SSH SOCKS proxy is now active on port 22"
    echo ""
    echo "Next steps:"
    echo "  1. Add a proxy user:"
    echo "     curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/add-user.sh -o add-user.sh && bash add-user.sh"
    echo ""
    echo "     Note: Password must be at least 8 characters."
    echo "           Password won't be visible while typing (this is normal)."
    echo ""
    echo "  2. Connect from your device:"
    echo "     ssh -D 1080 username@$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo ""
    echo "  3. Configure your browser/apps to use SOCKS5 proxy:"
    echo "     Host: localhost"
    echo "     Port: 1080"
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
    echo "  URL: https://$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):${PANEL_PORT}"
    echo "  Login with your server root credentials"
    echo ""
    echo "CLI Management commands:"
    echo "  Add user:     curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/add-user.sh -o add-user.sh && bash add-user.sh"
    echo "  Delete user:  curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/delete-user.sh -o delete-user.sh && bash delete-user.sh USERNAME"
    echo "  View users:   curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/view-users.sh -o view-users.sh && bash view-users.sh"
    echo "  List users:   curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/list-users.sh -o list-users.sh && bash list-users.sh"
    echo "  Check status: curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/status.sh -o status.sh && bash status.sh"
    echo ""
    echo "============================================"
}

# Trap errors
trap 'log "ERROR: Installation failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
