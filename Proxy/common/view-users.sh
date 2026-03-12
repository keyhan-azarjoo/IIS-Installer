#!/bin/bash

# User Management and Monitoring Script
# Shows connected users, bandwidth usage, and connection information

echo "=========================================="
echo "      PROXY USER MANAGEMENT"
echo "=========================================="
echo ""

# Detect which layer/service is installed
if systemctl is-active --quiet v2ray; then
    SERVICE_TYPE="v2ray"
    echo "Service Type: V2Ray"
elif systemctl is-active --quiet xray; then
    SERVICE_TYPE="xray"
    echo "Service Type: Xray"
elif systemctl is-active --quiet stunnel4; then
    SERVICE_TYPE="stunnel"
    echo "Service Type: Stunnel"
else
    SERVICE_TYPE="ssh"
    echo "Service Type: SSH/Nginx"
fi

echo "=========================================="
echo ""

# Function to show all system users
show_all_users() {
    echo "📋 ALL CONFIGURED USERS:"
    echo "------------------------------------------"

    if [ "$SERVICE_TYPE" = "v2ray" ] || [ "$SERVICE_TYPE" = "xray" ]; then
        # For V2Ray/Xray, read config file
        if [ -f /usr/local/etc/xray/config.json ]; then
            echo "Users (UUIDs):"
            grep -o '"id": "[^"]*"' /usr/local/etc/xray/config.json | cut -d'"' -f4 | nl
        elif [ -f /usr/local/etc/v2ray/config.json ]; then
            echo "Users (UUIDs):"
            grep -o '"id": "[^"]*"' /usr/local/etc/v2ray/config.json | cut -d'"' -f4 | nl
        fi
    else
        # For SSH-based methods
        echo "SSH Users:"
        awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd | nl
    fi

    echo ""
}

# Function to show currently connected users
show_connected_users() {
    echo "🔌 CURRENTLY CONNECTED USERS:"
    echo "------------------------------------------"

    if [ "$SERVICE_TYPE" = "v2ray" ] || [ "$SERVICE_TYPE" = "xray" ]; then
        # For V2Ray/Xray
        CONNECTIONS=$(netstat -tn 2>/dev/null | grep ':443' | grep ESTABLISHED | wc -l)
        echo "Active connections on port 443: $CONNECTIONS"
        echo ""
        echo "Connection details:"
        netstat -tn 2>/dev/null | grep ':443' | grep ESTABLISHED | awk '{print "  IP: " $5 " | Status: " $6}'
    else
        # For SSH-based methods
        echo "SSH Sessions:"
        who | nl
        echo ""
        echo "Detailed SSH connections:"
        netstat -tn 2>/dev/null | grep ':22\|:443' | grep ESTABLISHED | awk '{print "  IP: " $5 " | Status: " $6}'
    fi

    echo ""
}

# Function to show bandwidth usage
show_bandwidth() {
    echo "📊 BANDWIDTH USAGE:"
    echo "------------------------------------------"

    # Check if vnstat is installed
    if command -v vnstat &> /dev/null; then
        vnstat -d
    else
        echo "⚠️  vnstat not installed. Installing for bandwidth monitoring..."
        apt-get update > /dev/null 2>&1
        apt-get install -y vnstat > /dev/null 2>&1

        if [ $? -eq 0 ]; then
            # Initialize vnstat
            systemctl enable vnstat > /dev/null 2>&1
            systemctl start vnstat > /dev/null 2>&1
            sleep 2
            echo "✓ vnstat installed successfully"
            echo ""
            vnstat -d
        else
            echo "❌ Failed to install vnstat"
            echo "Showing basic interface statistics:"
            ip -s link
        fi
    fi

    echo ""
}

# Function to show connection times and history
show_connection_history() {
    echo "⏰ CONNECTION HISTORY (Last 20 logins):"
    echo "------------------------------------------"

    last -n 20 | head -n 20

    echo ""
}

# Function to show per-user data usage (SSH users)
show_user_data_usage() {
    if [ "$SERVICE_TYPE" = "ssh" ] || [ "$SERVICE_TYPE" = "stunnel" ]; then
        echo "💾 PER-USER DATA USAGE:"
        echo "------------------------------------------"

        # Get list of regular users
        USERS=$(awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd)

        for USER in $USERS; do
            # Get user's last login
            LAST_LOGIN=$(last -n 1 $USER | head -n 1 | awk '{print $4, $5, $6, $7}')

            # Check if user has active processes
            PROCESSES=$(ps -u $USER 2>/dev/null | wc -l)

            # Get connection count from logs
            CONNECTIONS=$(grep -c "$USER" /var/log/auth.log 2>/dev/null || echo "N/A")

            echo "User: $USER"
            echo "  Last login: $LAST_LOGIN"
            echo "  Active processes: $PROCESSES"
            echo "  Total connections in log: $CONNECTIONS"
            echo ""
        done
    fi
}

# Function to show system resources
show_system_resources() {
    echo "🖥️  SYSTEM RESOURCES:"
    echo "------------------------------------------"

    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo "CPU Usage: ${CPU_USAGE}%"

    # Memory usage
    MEM_INFO=$(free -h | grep Mem)
    MEM_TOTAL=$(echo $MEM_INFO | awk '{print $2}')
    MEM_USED=$(echo $MEM_INFO | awk '{print $3}')
    MEM_PERCENT=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
    echo "Memory: ${MEM_USED} / ${MEM_TOTAL} (${MEM_PERCENT:0:5}%)"

    # Disk usage
    DISK_INFO=$(df -h / | tail -n 1)
    DISK_USED=$(echo $DISK_INFO | awk '{print $3}')
    DISK_TOTAL=$(echo $DISK_INFO | awk '{print $2}')
    DISK_PERCENT=$(echo $DISK_INFO | awk '{print $5}')
    echo "Disk: ${DISK_USED} / ${DISK_TOTAL} (${DISK_PERCENT})"

    # Network interface
    MAIN_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n 1)
    echo "Main interface: ${MAIN_INTERFACE}"

    echo ""
}

# Main menu
while true; do
    show_all_users
    show_connected_users
    show_bandwidth
    show_system_resources

    echo "=========================================="
    echo "OPTIONS:"
    echo "=========================================="
    echo "1) Refresh view"
    echo "2) Show connection history"
    echo "3) Show per-user details"
    echo "4) Monitor in real-time (10s refresh)"
    echo "5) Exit"
    echo ""
    read -p "Select option [1-5]: " OPTION

    case $OPTION in
        1)
            clear
            ;;
        2)
            clear
            show_connection_history
            read -p "Press Enter to continue..."
            clear
            ;;
        3)
            clear
            show_user_data_usage
            read -p "Press Enter to continue..."
            clear
            ;;
        4)
            echo "Starting real-time monitoring (Ctrl+C to stop)..."
            while true; do
                clear
                show_all_users
                show_connected_users
                show_system_resources
                echo "Refreshing in 10 seconds... (Ctrl+C to stop)"
                sleep 10
            done
            ;;
        5)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option"
            sleep 2
            clear
            ;;
    esac
done
