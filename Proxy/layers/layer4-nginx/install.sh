#!/bin/bash
set -euo pipefail

# ============================================
# Layer 4: SSH via Nginx TCP Proxy (Port 443)
# SSH tunneled through Nginx on HTTPS port
# ============================================

SCRIPT_VERSION="2.0.0"
LOG_FILE="/var/log/ssh-proxy.log"
SSHD_CONFIG="/etc/ssh/sshd_config"
NGINX_CONF="/etc/nginx/nginx.conf"

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

    # Check disk space
    AVAILABLE=$(df / | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE" -lt 1048576 ]; then
        echo "Error: Less than 1GB disk space available"
        exit 1
    fi

    # Check if port 443 is in use
    if ss -tulpn | grep -q ":443 "; then
        echo "Warning: Port 443 is currently in use by:"
        ss -tulpn | grep ":443 " | awk '{print "  " $7}'
        echo ""
        echo "This installation will stop services using port 443"
        echo "Services that will be affected: Apache, Plesk, existing web servers"
        echo "Stopping conflicting services..."
    fi

    log "Pre-flight checks passed"
}

# Backup configuration
backup_config() {
    if [ -f "$SSHD_CONFIG" ]; then
        cp "$SSHD_CONFIG" "$SSHD_CONFIG.backup-$(date +%s)"
    fi
    if [ -f "$NGINX_CONF" ]; then
        cp "$NGINX_CONF" "$NGINX_CONF.backup-$(date +%s)"
    fi
    log "Configurations backed up"
}

# Main installation
main() {
    echo "============================================"
    echo " Layer 4: SSH via Nginx TCP Proxy"
    echo " Version: $SCRIPT_VERSION"
    echo "============================================"
    echo ""
    echo "This will:"
    echo "  • Configure SSH SOCKS proxy"
    echo "  • Install Nginx with stream module"
    echo "  • Forward port 443 → SSH (port 22)"
    echo "  • Disable Apache/Plesk (if running)"
    echo ""
    echo "After installation, connect using port 443"
    echo ""

    preflight_check

    echo ""
    echo "Starting installation..."
    log "=== Starting Layer 4 installation ==="

    # Backup before changes
    backup_config

    # Stop and disable services using port 443
    echo ""
    echo "Freeing port 443..."
    for svc in apache2 httpd plesk psa sw-cp-server sw-engine; do
        if systemctl is-active --quiet "$svc" 2>/dev/null; then
            log "Stopping $svc"
            systemctl stop "$svc" || true
            systemctl disable "$svc" || true
            systemctl mask "$svc" || true
        fi
    done

    # Kill remaining apache processes
    pkill -9 apache2 2>/dev/null || true

    log "Port 443 freed"

    # Update system
    echo ""
    echo "Updating system packages..."
    apt update && apt upgrade -y
    log "System updated"

    # Install packages
    echo "Installing required packages..."
    apt install -y openssh-server nginx-extras ufw
    log "Packages installed"

    # Configure SSH
    echo "Configuring SSH for SOCKS proxy..."

    sed -i '/^#\?AllowTcpForwarding/d' "$SSHD_CONFIG"
    sed -i '/^#\?PermitTunnel/d' "$SSHD_CONFIG"
    sed -i '/^#\?X11Forwarding/d' "$SSHD_CONFIG"

    cat >> "$SSHD_CONFIG" <<'EOF'

# SSH SOCKS Proxy Configuration
AllowTcpForwarding yes
PermitTunnel no
X11Forwarding no
EOF

    # Validate and restart SSH
    if ! sshd -t; then
        log "ERROR: Invalid SSH configuration"
        cp "$SSHD_CONFIG.backup-"* "$SSHD_CONFIG" 2>/dev/null || true
        exit 1
    fi

    systemctl enable ssh
    systemctl restart ssh

    if ! systemctl is-active --quiet ssh; then
        log "ERROR: SSH failed to start"
        echo "Error: SSH service failed to start"
        exit 1
    fi

    log "SSH configured"

    # Configure Nginx
    echo "Configuring Nginx..."

    # Clean old stream module loads
    sed -i '/ngx_stream_module.so/d' "$NGINX_CONF"

    # Create stream config directory
    mkdir -p /etc/nginx/stream.d

    # Create SSH bridge config
    cat > /etc/nginx/stream.d/ssh_443.conf <<'EOF'
# SSH SOCKS Proxy Bridge
server {
    listen 443;
    proxy_pass 127.0.0.1:22;
    proxy_timeout 1h;
    proxy_connect_timeout 10s;
}
EOF

    # Add stream block to nginx.conf if not present
    if ! grep -q "^stream {" "$NGINX_CONF"; then
        sed -i '/http {/i stream {\n    include /etc/nginx/stream.d/*.conf;\n}\n' "$NGINX_CONF"
    fi

    # Validate and start Nginx
    if ! nginx -t; then
        log "ERROR: Invalid Nginx configuration"
        cp "$NGINX_CONF.backup-"* "$NGINX_CONF" 2>/dev/null || true
        exit 1
    fi

    systemctl enable nginx
    systemctl restart nginx

    if ! systemctl is-active --quiet nginx; then
        log "ERROR: Nginx failed to start"
        echo "Error: Nginx service failed to start"
        journalctl -xe -u nginx --no-pager | tail -20
        exit 1
    fi

    log "Nginx configured"

    # Configure firewall
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
Layer: 4 (Nginx TCP Proxy)
Port: 443 → SSH (22)
Script Version: $SCRIPT_VERSION

Server IP: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "Unable to detect")
EOF

    log "=== Layer 4 installation completed ==="

    
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
            bash "${PROXY_REPO_ROOT}/panel/install-panel.sh" "--layer=layer4-nginx" "--repo-root=${PROXY_REPO_ROOT}" || log "WARN: Panel installation failed (non-critical)"
        else
            PANEL_SCRIPT_URL="https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/panel/install-panel.sh"
            curl -fsSL "$PANEL_SCRIPT_URL" -o /tmp/install-panel.sh && bash /tmp/install-panel.sh --layer=layer4-nginx || log "WARN: Panel installation failed (non-critical)"
            rm -f /tmp/install-panel.sh
        fi
    fi

    # Final output
    echo ""
    echo "============================================"
    echo " ✓ Installation Complete!"
    echo "============================================"
    echo ""
    echo "SSH SOCKS proxy is now active on port 443"
    echo ""
    echo "Services disabled:"
    echo "  • Apache/Plesk (port 443 freed)"
    echo ""
    echo "Next steps:"
    echo "  1. Add a proxy user:"
    echo "     curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/add-user.sh -o add-user.sh && bash add-user.sh"
    echo ""
    echo "     Note: Password must be at least 8 characters."
    echo "           Password won't be visible while typing (this is normal)."
    echo ""
    echo "  2. Connect from your device:"
    echo "     ssh -p 443 -D 1080 username@$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
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
