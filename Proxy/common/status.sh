#!/bin/bash

# ============================================
# SSH SOCKS Proxy - Status Script
# Show installation status and service health
# ============================================

echo "============================================"
echo " SSH SOCKS Proxy - System Status"
echo "============================================"
echo ""

# Detect installed layer
INSTALLED_LAYER="Unknown"

if systemctl is-active --quiet xray; then
    INSTALLED_LAYER="Layer 7 (V2Ray/Xray)"
elif [ -f /etc/stunnel/stunnel.conf ] && service stunnel4 status >/dev/null 2>&1; then
    INSTALLED_LAYER="Layer 6 (stunnel TLS)"
elif [ -f /etc/nginx/stream.d/ssh_443.conf ]; then
    INSTALLED_LAYER="Layer 4 (Nginx TCP Proxy)"
elif grep -q "^Port 22$" /etc/ssh/sshd_config 2>/dev/null; then
    INSTALLED_LAYER="Layer 3 (Basic SSH)"
fi

echo "Installed Layer: $INSTALLED_LAYER"
echo ""

# SSH Status
echo "--- SSH Service ---"
if systemctl is-active --quiet ssh; then
    echo "Status: ✓ Running"
    ssh_port=$(grep "^Port " /etc/ssh/sshd_config | awk '{print $2}' || echo "22")
    echo "Port: $ssh_port"
else
    echo "Status: ✗ Not running"
fi
echo ""

# Nginx Status (if installed)
if command -v nginx &>/dev/null; then
    echo "--- Nginx Service ---"
    if systemctl is-active --quiet nginx; then
        echo "Status: ✓ Running"
        if [ -f /etc/nginx/stream.d/ssh_443.conf ]; then
            echo "Config: SSH bridge on port 443"
        fi
    else
        echo "Status: ✗ Not running"
    fi
    echo ""
fi

# Stunnel Status (if installed)
if command -v stunnel4 &>/dev/null; then
    echo "--- Stunnel Service ---"
    if service stunnel4 status >/dev/null 2>&1; then
        echo "Status: ✓ Running"
        echo "Config: TLS wrapper on port 443"
    else
        echo "Status: ✗ Not running"
    fi
    echo ""
fi

# Xray Status (if installed)
if command -v xray &>/dev/null; then
    echo "--- Xray Service ---"
    if systemctl is-active --quiet xray; then
        echo "Status: ✓ Running"
        if [ -f /usr/local/etc/xray/config.json ]; then
            protocol=$(jq -r '.inbounds[0].protocol' /usr/local/etc/xray/config.json 2>/dev/null || echo "unknown")
            echo "Protocol: $protocol"
        fi
    else
        echo "Status: ✗ Not running"
    fi
    echo ""
fi

# Firewall Status
echo "--- Firewall (UFW) ---"
if command -v ufw &>/dev/null; then
    ufw_status=$(ufw status | head -1 | awk '{print $2}')
    if [ "$ufw_status" = "active" ]; then
        echo "Status: ✓ Active"
        echo "Open ports:"
        ufw status | grep ALLOW | awk '{print "  - " $1}'
    else
        echo "Status: ✗ Inactive"
    fi
else
    echo "Status: Not installed"
fi
echo ""

# Port binding check
echo "--- Port Binding ---"
echo "Port 443 in use by:"
if ss -tulpn | grep -q ":443 "; then
    ss -tulpn | grep ":443 " | awk '{print "  " $7}' | cut -d',' -f1 | uniq
else
    echo "  (Port 443 not in use)"
fi
echo ""

# User count
if [ -d /root/proxy-users ]; then
    user_count=$(ls -1 /root/proxy-users/*.txt 2>/dev/null | wc -l)
    echo "Active proxy users: $user_count"
else
    echo "Active proxy users: 0"
fi
echo ""

# Server IP
echo "Server IP: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "Unable to detect")"
echo ""

echo "============================================"
echo "To view logs:"
echo "  journalctl -xe -u ssh"
echo "  tail -f /var/log/ssh-proxy.log"
echo "============================================"
