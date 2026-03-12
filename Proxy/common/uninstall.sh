#!/bin/bash
set -euo pipefail

# ============================================
# SSH SOCKS Proxy - Uninstall Script
# Remove all proxy components
# ============================================

SCRIPT_VERSION="2.0.0"
LOG_FILE="/var/log/ssh-proxy.log"
SSHD_CONFIG="/etc/ssh/sshd_config"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

echo "============================================"
echo " SSH SOCKS Proxy - Uninstaller v$SCRIPT_VERSION"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

echo "WARNING: This will remove:"
echo "  - Proxy service configurations"
echo "  - Nginx stream configurations (if installed)"
echo "  - Stunnel configurations (if installed)"
echo "  - Xray/V2Ray service (if installed)"
echo "  - Firewall rules added by the installer"
echo ""
echo "User accounts and data will be PRESERVED for future reinstall."
echo "SSH server will remain running normally."
echo ""

log "=== Starting uninstallation ==="

# Backup current config to /tmp to avoid read-only FS issues
cp "$SSHD_CONFIG" "/tmp/sshd_config.backup-uninstall-$(date +%s)"

# Disconnect active proxy sessions (but keep user accounts)
if [ -d /root/proxy-users ]; then
    echo ""
    echo "Disconnecting active proxy sessions..."
    for user_file in /root/proxy-users/*.txt; do
        if [ -f "$user_file" ]; then
            username=$(basename "$user_file" .txt)
            if id "$username" &>/dev/null; then
                pkill -u "$username" 2>/dev/null || true
            fi
        fi
    done
    echo "  User accounts preserved in /root/proxy-users/"
fi

# Remove Match User blocks from sshd_config (use temp file to avoid sed -i issues)
echo "Cleaning SSH configuration..."
sed '/^Match User /,/^$/d' "$SSHD_CONFIG" > /tmp/sshd_config.tmp
sed -i '/^AllowTcpForwarding yes$/d' /tmp/sshd_config.tmp
sed -i '/^PermitTunnel no$/d' /tmp/sshd_config.tmp
sed -i '/^X11Forwarding no$/d' /tmp/sshd_config.tmp
cp /tmp/sshd_config.tmp "$SSHD_CONFIG"
rm -f /tmp/sshd_config.tmp

# Restart SSH
systemctl restart ssh
log "SSH configuration cleaned"

# Remove Xray/V2Ray (preserve user data)
if command -v xray &>/dev/null; then
    echo "Removing Xray..."
    # Preserve users.json and server-config.json for future reinstall
    mkdir -p /root/proxy-users
    for f in users.json server-config.json; do
        if [ -f "/usr/local/etc/xray/$f" ]; then
            cp "/usr/local/etc/xray/$f" "/root/proxy-users/xray-$f"
            echo "  Preserved: /root/proxy-users/xray-$f"
        fi
    done
    systemctl stop xray || true
    systemctl disable xray || true
    bash <(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh) remove --purge || true
    rm -rf /usr/local/etc/xray /etc/xray
    log "Xray removed (user data preserved in /root/proxy-users/)"
fi

# Remove stunnel
if command -v stunnel4 &>/dev/null; then
    echo "Removing stunnel..."
    service stunnel4 stop || true
    apt purge -y stunnel4 || true
    rm -rf /etc/stunnel
    # Remove cron job
    crontab -l 2>/dev/null | grep -v stunnel4 | crontab - || true
    log "Stunnel removed"
fi

# Remove Nginx stream config (but keep Nginx installed)
if [ -f /etc/nginx/stream.d/ssh_443.conf ]; then
    echo "Removing Nginx stream configuration..."
    rm -f /etc/nginx/stream.d/ssh_443.conf
    # Remove stream block from nginx.conf
    sed '/^stream {/,/^}/d' /etc/nginx/nginx.conf > /tmp/nginx.conf.tmp
    cp /tmp/nginx.conf.tmp /etc/nginx/nginx.conf
    rm -f /tmp/nginx.conf.tmp
    nginx -t && systemctl reload nginx || true
    log "Nginx stream configuration removed"
fi

# Unmask services that were masked
echo "Unmasking services..."
for svc in nginx apache2 httpd plesk psa sw-cp-server sw-engine; do
    systemctl unmask $svc 2>/dev/null || true
done

# Note: We don't modify firewall rules automatically as they might be needed for other services
echo ""
echo "============================================"
echo " ✓ Uninstallation complete"
echo "============================================"
echo ""
echo "Notes:"
echo "  - SSH server is still running normally"
echo "  - User accounts and data are PRESERVED in /root/proxy-users/"
echo "  - V2Ray user data (if any) backed up to /root/proxy-users/xray-*.json"
echo "  - Nginx is still installed (if it was before)"
echo "  - Apache/Plesk have been unmasked"
echo "  - Firewall rules were NOT modified (manage manually if needed)"
echo ""
echo "To remove firewall rules manually:"
echo "  ufw status numbered"
echo "  ufw delete <number>"
echo ""

log "=== Uninstallation completed ==="
