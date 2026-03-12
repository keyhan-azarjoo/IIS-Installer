#!/bin/bash
set -euo pipefail

# ============================================
# SSH SOCKS Proxy - Backup Configuration
# Export all configurations for migration
# ============================================

BACKUP_DIR="/root/proxy-backup-$(date +%Y%m%d-%H%M%S)"

echo "============================================"
echo " SSH SOCKS Proxy - Configuration Backup"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Creating backup in: $BACKUP_DIR"
echo ""

# Backup SSH config
if [ -f /etc/ssh/sshd_config ]; then
    cp /etc/ssh/sshd_config "$BACKUP_DIR/"
    echo "✓ SSH configuration backed up"
fi

# Backup user list
if [ -d /root/proxy-users ]; then
    cp -r /root/proxy-users "$BACKUP_DIR/"
    echo "✓ User list backed up"
fi

# Backup Nginx configs
if [ -d /etc/nginx/stream.d ]; then
    mkdir -p "$BACKUP_DIR/nginx"
    cp -r /etc/nginx/stream.d "$BACKUP_DIR/nginx/"
    cp /etc/nginx/nginx.conf "$BACKUP_DIR/nginx/" 2>/dev/null || true
    echo "✓ Nginx configuration backed up"
fi

# Backup stunnel config
if [ -f /etc/stunnel/stunnel.conf ]; then
    mkdir -p "$BACKUP_DIR/stunnel"
    cp -r /etc/stunnel/* "$BACKUP_DIR/stunnel/"
    echo "✓ Stunnel configuration backed up"
fi

# Backup Xray config
if [ -d /usr/local/etc/xray ]; then
    mkdir -p "$BACKUP_DIR/xray"
    cp -r /usr/local/etc/xray/* "$BACKUP_DIR/xray/"
    echo "✓ Xray configuration backed up"
fi

if [ -d /etc/xray ]; then
    mkdir -p "$BACKUP_DIR/xray"
    cp -r /etc/xray/* "$BACKUP_DIR/xray/"
fi

# Backup logs
if [ -f /var/log/ssh-proxy.log ]; then
    cp /var/log/ssh-proxy.log "$BACKUP_DIR/"
    echo "✓ Logs backed up"
fi

# Create info file
cat > "$BACKUP_DIR/backup-info.txt" <<EOF
SSH SOCKS Proxy - Configuration Backup
======================================

Backup Date: $(date)
Server IP: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "Unknown")
Hostname: $(hostname)

Installed Components:
EOF

# Detect installed components
if systemctl is-active --quiet xray; then
    echo "  - Xray (V2Ray)" >> "$BACKUP_DIR/backup-info.txt"
fi

if [ -f /etc/stunnel/stunnel.conf ]; then
    echo "  - Stunnel TLS" >> "$BACKUP_DIR/backup-info.txt"
fi

if [ -f /etc/nginx/stream.d/ssh_443.conf ]; then
    echo "  - Nginx TCP Proxy" >> "$BACKUP_DIR/backup-info.txt"
fi

# List users
if [ -d /root/proxy-users ]; then
    user_count=$(ls -1 /root/proxy-users/*.txt 2>/dev/null | wc -l)
    echo "" >> "$BACKUP_DIR/backup-info.txt"
    echo "Active Users: $user_count" >> "$BACKUP_DIR/backup-info.txt"
    if [ "$user_count" -gt 0 ]; then
        echo "" >> "$BACKUP_DIR/backup-info.txt"
        echo "User List:" >> "$BACKUP_DIR/backup-info.txt"
        for user_file in /root/proxy-users/*.txt; do
            username=$(basename "$user_file" .txt)
            echo "  - $username" >> "$BACKUP_DIR/backup-info.txt"
        done
    fi
fi

echo "✓ Backup information saved"

# Create tarball
cd /root
tar -czf "proxy-backup-$(date +%Y%m%d-%H%M%S).tar.gz" "$(basename "$BACKUP_DIR")"

echo ""
echo "============================================"
echo " ✓ Backup completed successfully"
echo "============================================"
echo ""
echo "Backup location:"
echo "  $BACKUP_DIR"
echo ""
echo "Compressed archive:"
echo "  /root/proxy-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
echo ""
echo "To restore on another server:"
echo "  1. Copy the tar.gz file to the new server"
echo "  2. Extract: tar -xzf proxy-backup-*.tar.gz"
echo "  3. Copy configurations to their original locations"
echo "  4. Recreate users manually with add-user.sh"
echo ""
