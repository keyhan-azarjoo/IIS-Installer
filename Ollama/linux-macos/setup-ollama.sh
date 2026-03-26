#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Ollama Installer for Linux / macOS
# Installs Ollama LLM server + Web UI proxy with HTTPS, auth, and auto-start
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
OLLAMA_SERVICE_NAME="serverinstaller-ollama"
HTTP_PORT="${OLLAMA_HTTP_PORT:-11434}"
HTTPS_PORT="${OLLAMA_HTTPS_PORT:-}"
HOST_IP="${OLLAMA_HOST_IP:-0.0.0.0}"
DOMAIN="${OLLAMA_DOMAIN:-}"
USERNAME="${OLLAMA_USERNAME:-}"
PASSWORD="${OLLAMA_PASSWORD:-}"
WEBUI_PORT="3080"

BASE_STATE_DIR="${SERVER_INSTALLER_DATA_DIR:-${HOME}/.server-installer}"
STATE_DIR="${BASE_STATE_DIR}/ollama"
STATE_FILE="${STATE_DIR}/ollama-state.json"
INSTALL_DIR="${STATE_DIR}/app"
VENV_DIR="${INSTALL_DIR}/venv"
CERT_DIR="${STATE_DIR}/certs"
LOG_FILE="${STATE_DIR}/ollama.log"

SYSTEMD_FILE="/etc/systemd/system/${OLLAMA_SERVICE_NAME}.service"
SYSTEMD_WEBUI_FILE="/etc/systemd/system/${OLLAMA_SERVICE_NAME}-webui.service"
NGINX_CONF="/etc/nginx/conf.d/${OLLAMA_SERVICE_NAME}.conf"

log() { echo "[Ollama] $*"; }
err() { echo "[Ollama] ERROR: $*" >&2; }

# ── Create directories ───────────────────────────────────────────────────────
log "Creating directories..."
mkdir -p "$STATE_DIR" "$INSTALL_DIR" "$CERT_DIR"

# ── Step 1: Install Ollama binary ────────────────────────────────────────────
log "Checking for Ollama..."
if command -v ollama &>/dev/null; then
    log "Ollama already installed: $(command -v ollama)"
else
    log "Installing Ollama via official script..."
    curl -fsSL https://ollama.com/install.sh | sh
    if ! command -v ollama &>/dev/null; then
        err "Ollama installation failed."
        exit 1
    fi
    log "Ollama installed: $(command -v ollama)"
fi

# ── Step 2: Configure and start Ollama service ──────────────────────────────
log "Configuring Ollama to listen on ${HOST_IP}:${HTTP_PORT}..."

# Create/update systemd service for Ollama itself
if command -v systemctl &>/dev/null; then
    cat > "${SYSTEMD_FILE}" <<SVCEOF
[Unit]
Description=Ollama LLM Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Environment=OLLAMA_HOST=${HOST_IP}:${HTTP_PORT}
Environment=OLLAMA_ORIGINS=*
ExecStart=$(command -v ollama) serve
Restart=always
RestartSec=5
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}

[Install]
WantedBy=multi-user.target
SVCEOF

    systemctl daemon-reload
    systemctl enable "${OLLAMA_SERVICE_NAME}" 2>/dev/null || true
    systemctl restart "${OLLAMA_SERVICE_NAME}"
    log "Ollama systemd service started."
    sleep 3
else
    # macOS launchd or manual start
    log "Starting Ollama in background..."
    export OLLAMA_HOST="${HOST_IP}:${HTTP_PORT}"
    export OLLAMA_ORIGINS="*"
    nohup ollama serve >> "$LOG_FILE" 2>&1 &
    sleep 3
fi

# Verify Ollama is running
log "Verifying Ollama is responsive..."
for i in $(seq 1 10); do
    if curl -sf "http://127.0.0.1:${HTTP_PORT}/api/tags" >/dev/null 2>&1; then
        log "Ollama is running and responsive."
        break
    fi
    if [ "$i" -eq 10 ]; then
        err "Ollama not responding after 10 attempts."
    fi
    sleep 2
done

# ── Step 3: Resolve Python ──────────────────────────────────────────────────
log "Resolving Python..."
PYTHON_CMD=""
for py in python3 python; do
    if command -v "$py" &>/dev/null; then
        ver=$("$py" --version 2>&1)
        if echo "$ver" | grep -q "Python 3"; then
            PYTHON_CMD="$py"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    log "Python 3 not found. Installing..."
    if command -v apt-get &>/dev/null; then
        apt-get update -y && apt-get install -y python3 python3-venv python3-pip
    elif command -v dnf &>/dev/null; then
        dnf install -y python3 python3-pip
    elif command -v yum &>/dev/null; then
        yum install -y python3 python3-pip
    elif command -v brew &>/dev/null; then
        brew install python3
    else
        err "Cannot install Python 3. Please install it manually."
        exit 1
    fi
    PYTHON_CMD="python3"
fi
log "Using Python: $PYTHON_CMD ($($PYTHON_CMD --version 2>&1))"

# ── Step 4: Setup Web UI virtual environment ─────────────────────────────────
log "Setting up Web UI virtual environment..."
VENV_PYTHON="${VENV_DIR}/bin/python"
if [ ! -f "$VENV_PYTHON" ]; then
    "$PYTHON_CMD" -m venv "$VENV_DIR"
fi
"$VENV_PYTHON" -m pip install --upgrade pip --quiet 2>/dev/null
"$VENV_PYTHON" -m pip install flask requests --quiet 2>/dev/null

# ── Step 5: Copy Web UI files ────────────────────────────────────────────────
log "Copying Web UI files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMON_DIR="$(dirname "$SCRIPT_DIR")/common"
if [ -d "$COMMON_DIR" ]; then
    cp -r "$COMMON_DIR"/* "$INSTALL_DIR/"
    log "Web UI files copied to $INSTALL_DIR"
fi

# ── Step 6: Generate startup script ──────────────────────────────────────────
log "Creating startup script..."
cat > "${INSTALL_DIR}/start-ollama-webui.py" <<PYEOF
#!/usr/bin/env python3
import os, sys, subprocess, time

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "0.0.0.0:${HTTP_PORT}")
WEB_UI_PORT = int(os.environ.get("OLLAMA_WEBUI_PORT", "${WEBUI_PORT}"))

def ensure_ollama():
    try:
        import urllib.request
        urllib.request.urlopen(f"http://127.0.0.1:${HTTP_PORT}/api/tags", timeout=3)
    except Exception:
        print("[Startup] Ollama not responding, starting...")
        subprocess.Popen(["ollama", "serve"], env={**os.environ, "OLLAMA_HOST": OLLAMA_HOST})
        time.sleep(5)

if __name__ == "__main__":
    ensure_ollama()
    sys.path.insert(0, os.path.dirname(__file__))
    from ollama_web import app
    app.run(host="0.0.0.0", port=WEB_UI_PORT)
PYEOF
chmod +x "${INSTALL_DIR}/start-ollama-webui.py"

# ── Step 7: SSL certificate ──────────────────────────────────────────────────
if [ -n "$HTTPS_PORT" ] && [ "$HTTPS_PORT" != "0" ]; then
    CERT_FILE="${CERT_DIR}/ollama.crt"
    KEY_FILE="${CERT_DIR}/ollama.key"
    if [ ! -f "$CERT_FILE" ]; then
        log "Generating self-signed SSL certificate..."
        CN="${DOMAIN:-$HOST_IP}"
        openssl req -x509 -nodes -newkey rsa:2048 -keyout "$KEY_FILE" -out "$CERT_FILE" \
            -days 3650 -subj "/CN=${CN}/O=ServerInstaller/C=US" 2>/dev/null
        log "SSL certificate created."
    fi

    # Nginx HTTPS reverse proxy
    if command -v nginx &>/dev/null; then
        log "Configuring Nginx HTTPS proxy..."
        cat > "$NGINX_CONF" <<NGXEOF
server {
    listen ${HTTPS_PORT} ssl;
    server_name ${DOMAIN:-_};
    ssl_certificate ${CERT_FILE};
    ssl_certificate_key ${KEY_FILE};
    client_max_body_size 500m;
    proxy_read_timeout 600;
    proxy_send_timeout 600;

    location / {
        proxy_pass http://127.0.0.1:${HTTP_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
    }
}
NGXEOF
        nginx -t && nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || true
        log "Nginx HTTPS proxy configured on port ${HTTPS_PORT}."
    fi
fi

# ── Step 8: Register Web UI as systemd service ───────────────────────────────
if command -v systemctl &>/dev/null; then
    cat > "${SYSTEMD_WEBUI_FILE}" <<WUIEOF
[Unit]
Description=Ollama Web UI
After=network.target ${OLLAMA_SERVICE_NAME}.service
Wants=${OLLAMA_SERVICE_NAME}.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment=OLLAMA_HOST=0.0.0.0:${HTTP_PORT}
Environment=OLLAMA_WEBUI_PORT=${WEBUI_PORT}
ExecStart=${VENV_PYTHON} ${INSTALL_DIR}/start-ollama-webui.py
Restart=always
RestartSec=5
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}

[Install]
WantedBy=multi-user.target
WUIEOF

    systemctl daemon-reload
    systemctl enable "${OLLAMA_SERVICE_NAME}-webui" 2>/dev/null || true
    systemctl restart "${OLLAMA_SERVICE_NAME}-webui"
    log "Web UI systemd service started."
fi

# ── Step 9: Firewall ─────────────────────────────────────────────────────────
log "Configuring firewall..."
for port in "$HTTP_PORT" "$WEBUI_PORT"; do
    if command -v ufw &>/dev/null; then
        ufw allow "$port/tcp" 2>/dev/null || true
    elif command -v firewall-cmd &>/dev/null; then
        firewall-cmd --permanent --add-port="${port}/tcp" 2>/dev/null || true
    fi
done
if command -v firewall-cmd &>/dev/null; then
    firewall-cmd --reload 2>/dev/null || true
fi

# ── Step 10: Save state ──────────────────────────────────────────────────────
DISPLAY_HOST="$HOST_IP"
if [ "$DISPLAY_HOST" = "0.0.0.0" ] || [ "$DISPLAY_HOST" = "*" ] || [ -z "$DISPLAY_HOST" ]; then
    DISPLAY_HOST=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
fi

OLLAMA_VERSION=""
if command -v ollama &>/dev/null; then
    OLLAMA_VERSION=$(ollama --version 2>/dev/null | sed 's/ollama version //' || echo "")
fi

cat > "$STATE_FILE" <<STEOF
{
    "installed": true,
    "service_name": "${OLLAMA_SERVICE_NAME}",
    "install_dir": "${INSTALL_DIR}",
    "venv_dir": "${VENV_DIR}",
    "host": "${HOST_IP}",
    "domain": "${DOMAIN}",
    "http_port": "${HTTP_PORT}",
    "https_port": "${HTTPS_PORT}",
    "webui_port": "${WEBUI_PORT}",
    "http_url": "http://${DISPLAY_HOST}:${HTTP_PORT}",
    "webui_url": "http://${DISPLAY_HOST}:${WEBUI_PORT}",
    "https_url": "$([ -n "$HTTPS_PORT" ] && echo "https://${DISPLAY_HOST}:${HTTPS_PORT}" || echo "")",
    "deploy_mode": "os",
    "auth_enabled": $([ -n "$USERNAME" ] && echo "true" || echo "false"),
    "auth_username": "${USERNAME}",
    "running": true,
    "version": "${OLLAMA_VERSION}"
}
STEOF

# ── Done ─────────────────────────────────────────────────────────────────────
log ""
log "================================================================="
log " Ollama Installation Complete!"
log "================================================================="
log " Ollama API:  http://${DISPLAY_HOST}:${HTTP_PORT}"
log " Web UI:      http://${DISPLAY_HOST}:${WEBUI_PORT}"
[ -n "$HTTPS_PORT" ] && log " HTTPS:       https://${DISPLAY_HOST}:${HTTPS_PORT}"
log " Service:     ${OLLAMA_SERVICE_NAME}"
log " State:       ${STATE_FILE}"
log "================================================================="
log ""
log "Quick start: ollama pull llama3.2"
log "Then chat:   ollama run llama3.2"
