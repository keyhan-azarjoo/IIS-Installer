#!/bin/bash
set -euo pipefail

# ============================================
# SSH SOCKS Proxy - List Users Script
# Display all proxy users
# ============================================

SSHD_CONFIG="/etc/ssh/sshd_config"
USER_DIR="/root/proxy-users"

echo "============================================"
echo " SSH SOCKS Proxy - Active Users"
echo "============================================"
echo ""

# Check if user directory exists
if [ ! -d "$USER_DIR" ]; then
    echo "No users found"
    exit 0
fi

# Count users
USER_COUNT=$(ls -1 "$USER_DIR"/*.txt 2>/dev/null | wc -l)

if [ "$USER_COUNT" -eq 0 ]; then
    echo "No users found"
    exit 0
fi

echo "Total users: $USER_COUNT"
echo ""

# List each user with details
for user_file in "$USER_DIR"/*.txt; do
    if [ -f "$user_file" ]; then
        username=$(basename "$user_file" .txt)

        # Check if user still exists in system
        if id "$username" &>/dev/null; then
            status="✓ Active"

            # Check if user has active connections
            active_conns=$(who | grep -c "^$username " || true)
            if [ "$active_conns" -gt 0 ]; then
                status="✓ Active (Connected)"
            fi
        else
            status="✗ Deleted from system"
        fi

        echo "Username: $username"
        echo "Status: $status"

        # Show creation date if available
        if grep -q "Created:" "$user_file"; then
            created=$(grep "Created:" "$user_file" | cut -d: -f2-)
            echo "Created:$created"
        fi

        echo "---"
    fi
done

echo ""
echo "To view active SSH connections:"
echo "  ss -tnp | grep :22"
echo ""
