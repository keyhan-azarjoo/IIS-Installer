#!/bin/bash
set -euo pipefail

# ============================================
# Layer 6: SSH over TLS (stunnel on Port 443)
# Double encryption: SSH + TLS wrapper
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

allow_dashboard_port() {
    local dashboard_port="${SERVER_INSTALLER_DASHBOARD_PORT:-}"
    if [[ "$dashboard_port" =~ ^[0-9]+$ ]] && [ "$dashboard_port" -ge 1 ] && [ "$dashboard_port" -le 65535 ]; then
        ufw allow "${dashboard_port}/tcp" >/dev/null 2>&1 || true
        log "Dashboard port ${dashboard_port}/tcp allowed through firewall"
    fi
}


# Pre-flight checks
preflight_check() {
    log "Running pre-flight checks..."

    if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
        echo "Warning: This script is designed for Ubuntu"
        echo "Continuing anyway..."
    fi

    if [ "$EUID" -ne 0 ]; then
        echo "Error: This script must be run as root"
        exit 1
    fi

    AVAILABLE=$(df / | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE" -lt 1048576 ]; then
        echo "Error: Less than 1GB disk space available"
        exit 1
    fi

    if ss -tulpn | grep -q ":443 "; then
        echo "Warning: Port 443 is in use. Will be freed during installation."
        echo "Continuing..."
    fi

    log "Pre-flight checks passed"
}

# Main installation
main() {
    echo "============================================"
    echo " Layer 6: SSH over TLS (stunnel)"
    echo " Version: $SCRIPT_VERSION"
    echo "============================================"
    echo ""
    echo "This will:"
    echo "  • Configure SSH SOCKS proxy"
    echo "  • Install stunnel4 (TLS wrapper)"
    echo "  • Create self-signed certificate"
    echo "  • Forward port 443 → SSH with TLS encryption"
    echo "  • Disable services using port 443"
    echo ""
    echo "Provides double encryption: TLS + SSH"
    echo ""

    preflight_check

    echo ""
    echo "Starting installation..."
    log "=== Starting Layer 6 installation ==="

    # Backup
    [ -f "$SSHD_CONFIG" ] && cp "$SSHD_CONFIG" "$SSHD_CONFIG.backup-$(date +%s)"

    # Free port 443
    echo ""
    echo "Freeing port 443..."
    for svc in nginx apache2 httpd plesk psa sw-cp-server sw-engine; do
        systemctl stop "$svc" 2>/dev/null || true
        systemctl disable "$svc" 2>/dev/null || true
        systemctl mask "$svc" 2>/dev/null || true
    done
    log "Port 443 freed"

    # Update and install
    echo ""
    echo "Installing packages..."
    apt update -y
    apt install -y openssh-server stunnel4 openssl ufw
    log "Packages installed"

    # Configure SSH
    echo "Configuring SSH..."
    sed -i '/^#\?AllowTcpForwarding/d' "$SSHD_CONFIG"
    sed -i '/^#\?PermitTunnel/d' "$SSHD_CONFIG"
    sed -i '/^#\?X11Forwarding/d' "$SSHD_CONFIG"

    cat >> "$SSHD_CONFIG" <<'EOF'

# SSH SOCKS Proxy Configuration
AllowTcpForwarding yes
PermitTunnel no
X11Forwarding no
EOF

    sshd -t || { log "ERROR: Invalid SSH config"; exit 1; }
    systemctl restart ssh
    systemctl is-active --quiet ssh || { log "ERROR: SSH failed"; exit 1; }
    log "SSH configured"

    # Create stunnel certificate
    echo "Creating TLS certificate..."
    mkdir -p /etc/stunnel

    openssl req -new -x509 -nodes -days 3650 \
      -keyout /etc/stunnel/stunnel.pem \
      -out /etc/stunnel/stunnel.pem \
      -subj "/C=XX/ST=Self/L=Self/O=PrivateProxy/CN=proxy.local"

    chmod 600 /etc/stunnel/stunnel.pem
    log "TLS certificate created"

    # Configure stunnel
    echo "Configuring stunnel..."
    cat > /etc/stunnel/stunnel.conf <<'EOF'
pid = /var/run/stunnel.pid
output = /var/log/stunnel.log
foreground = no
client = no

[ssh-tls]
accept = 443
connect = 127.0.0.1:22
cert = /etc/stunnel/stunnel.pem
EOF

    # Enable stunnel
    sed -i 's/^ENABLED=.*/ENABLED=1/' /etc/default/stunnel4

    # Start stunnel (use SysV for compatibility)
    service stunnel4 restart

    # Verify stunnel is running
    sleep 2
    if ! service stunnel4 status >/dev/null 2>&1; then
        log "ERROR: Stunnel failed to start"
        echo "Error: Stunnel service failed"
        exit 1
    fi

    # Ensure auto-start with cron fallback
    CRON_JOB="@reboot /usr/bin/service stunnel4 restart"
    (crontab -l 2>/dev/null | grep -v stunnel4; echo "$CRON_JOB") | crontab -

    log "Stunnel configured"

    # Firewall
    echo "Configuring firewall..."
    ufw allow 443/tcp
    ufw allow 22/tcp
    allow_dashboard_port
    ufw --force enable
    log "Firewall configured"

    # Create directories
    mkdir -p /root/proxy-users
    touch "$LOG_FILE"

    # Save installation info
    cat > /root/proxy-installation-info.txt <<EOF
Installation Details
====================
Date: $(date)
Layer: 6 (Stunnel TLS)
Port: 443 (TLS → SSH)
Script Version: $SCRIPT_VERSION

Server IP: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "Unable to detect")

Certificate: /etc/stunnel/stunnel.pem
EOF

    log "=== Layer 6 installation completed ==="

    
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
            bash "${PROXY_REPO_ROOT}/panel/install-panel.sh" "--layer=layer6-stunnel" "--repo-root=${PROXY_REPO_ROOT}" || log "WARN: Panel installation failed (non-critical)"
        else
            PANEL_SCRIPT_URL="https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/panel/install-panel.sh"
            curl -fsSL "$PANEL_SCRIPT_URL" -o /tmp/install-panel.sh && bash /tmp/install-panel.sh --layer=layer6-stunnel || log "WARN: Panel installation failed (non-critical)"
            rm -f /tmp/install-panel.sh
        fi
    fi

    # Final output
    echo ""
    echo "============================================"
    echo " ✓ Installation Complete!"
    echo "============================================"
    echo ""
    echo "SSH over TLS is now active on port 443"
    echo ""
    echo "Features:"
    echo "  • Double encryption (TLS + SSH)"
    echo "  • Port 443 (HTTPS port)"
    echo "  • Self-signed certificate"
    echo ""
    echo "Next steps:"
    echo "  1. Add a proxy user:"
    echo "     curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/add-user.sh -o add-user.sh && bash add-user.sh"
    echo ""
    echo "     Note: Password must be at least 8 characters."
    echo "           Password won't be visible while typing (this is normal)."
    echo ""
    echo "  2. On iOS (NPV Tunnel):"
    echo "     - Select 'SSH + SSL' mode"
    echo "     - Server: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo "     - Port: 443"
    echo "     - Username/Password: from step 1"
    echo ""
    echo "  3. On Android/Desktop:"
    echo "     - Use stunnel client to connect to port 443"
    echo "     - Then SSH to localhost:22"
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

trap 'log "ERROR: Installation failed at line $LINENO"; exit 1' ERR
main "$@"
