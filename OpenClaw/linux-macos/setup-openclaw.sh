#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenClaw Installer for Linux / macOS
# Installs the real OpenClaw AI agent platform (Node.js based)
# Supports: npm install, Docker, or from source
# ─────────────────────────────────────────────────────────────────────────────
set -eo pipefail
HOME="${HOME:-/root}"
export HOME

SERVICE_NAME="serverinstaller-openclaw"
HTTP_PORT="${OPENCLAW_HTTP_PORT:-}"
HTTPS_PORT="${OPENCLAW_HTTPS_PORT:-}"
HOST_IP="${OPENCLAW_HOST_IP:-0.0.0.0}"
DOMAIN="${OPENCLAW_DOMAIN:-}"
USERNAME="${OPENCLAW_USERNAME:-}"
PASSWORD="${OPENCLAW_PASSWORD:-}"
OPENCLAW_PORT="${HTTP_PORT:-18789}"

BASE_STATE_DIR="${SERVER_INSTALLER_DATA_DIR:-${HOME}/.server-installer}"
STATE_DIR="${BASE_STATE_DIR}/openclaw"
STATE_FILE="${STATE_DIR}/openclaw-state.json"
INSTALL_DIR="${STATE_DIR}/app"
CERT_DIR="${STATE_DIR}/certs"
LOG_FILE="${STATE_DIR}/openclaw.log"
SYSTEMD_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

log() { echo "[OpenClaw] $*"; }
mkdir -p "$STATE_DIR" "$INSTALL_DIR" "$CERT_DIR"

# ── Step 1: Install Node.js if not present ──────────────────────────────────
log "Checking Node.js..."
NODE_CMD=""
for node in node nodejs; do
    if command -v "$node" &>/dev/null; then
        NODE_VER=$("$node" --version 2>/dev/null | sed 's/v//')
        NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
        if [ "$NODE_MAJOR" -ge 22 ] 2>/dev/null; then
            NODE_CMD="$node"
            log "Node.js $NODE_VER found."
            break
        else
            log "Node.js $NODE_VER found but need v22+. Will install newer version."
        fi
    fi
done

if [ -z "$NODE_CMD" ]; then
    log "Installing Node.js..."
    if command -v apt-get &>/dev/null; then
        # Debian/Ubuntu — use NodeSource
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash - 2>/dev/null || true
        apt-get install -y nodejs 2>/dev/null || true
    elif command -v dnf &>/dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - 2>/dev/null || true
        dnf install -y nodejs 2>/dev/null || true
    elif command -v brew &>/dev/null; then
        brew install node@22 2>/dev/null || brew install node 2>/dev/null || true
    elif command -v yum &>/dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - 2>/dev/null || true
        yum install -y nodejs 2>/dev/null || true
    fi
    # Verify
    if command -v node &>/dev/null; then
        NODE_CMD="node"
        log "Node.js $(node --version) installed."
    else
        log "ERROR: Could not install Node.js. Install Node.js 22+ manually."
        log "Visit: https://nodejs.org/"
        exit 1
    fi
fi

# ── Step 2: Install OpenClaw via npm ────────────────────────────────────────
log "Installing OpenClaw..."
if command -v openclaw &>/dev/null; then
    log "OpenClaw already installed: $(openclaw --version 2>/dev/null || echo 'unknown')"
    npm update -g openclaw 2>/dev/null || true
else
    npm install -g openclaw@latest 2>&1 || {
        log "npm global install failed. Trying with sudo..."
        sudo npm install -g openclaw@latest 2>&1 || {
            log "npm install failed. Trying npx..."
        }
    }
fi

# Verify installation
OPENCLAW_CMD=""
if command -v openclaw &>/dev/null; then
    OPENCLAW_CMD="openclaw"
    OPENCLAW_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
    log "OpenClaw $OPENCLAW_VERSION installed."
else
    log "WARNING: openclaw command not found in PATH after install."
    # Check common npm global paths
    for p in /usr/local/bin/openclaw /usr/bin/openclaw "${HOME}/.npm-global/bin/openclaw" "$(npm config get prefix 2>/dev/null)/bin/openclaw"; do
        if [ -x "$p" ] 2>/dev/null; then
            OPENCLAW_CMD="$p"
            log "Found at: $OPENCLAW_CMD"
            break
        fi
    done
fi

# ── Step 3: Also install Python web UI proxy (for remote access with auth) ─
log "Setting up web UI proxy..."
PYTHON_CMD=""
for py in python3 python; do
    command -v "$py" &>/dev/null && "$py" --version 2>&1 | grep -q "Python 3" && PYTHON_CMD="$py" && break
done
if [ -n "$PYTHON_CMD" ]; then
    VENV_DIR="${INSTALL_DIR}/venv"
    VENV_PYTHON="${VENV_DIR}/bin/python"
    [ ! -f "$VENV_PYTHON" ] && "$PYTHON_CMD" -m venv "$VENV_DIR" 2>/dev/null || true
    if [ -f "$VENV_PYTHON" ]; then
        "$VENV_PYTHON" -m pip install --upgrade pip --quiet 2>/dev/null
        "$VENV_PYTHON" -m pip install flask requests --quiet 2>/dev/null
        log "Web UI proxy dependencies installed."
    fi
fi

# Copy web UI files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMON_DIR="$(dirname "$SCRIPT_DIR")/common"
if [ -d "$COMMON_DIR" ]; then
    cp -r "$COMMON_DIR"/* "$INSTALL_DIR/"
    log "Web UI files copied."
fi

# ── Step 4: Skip web UI if no ports ─────────────────────────────────────────
if [ -z "${HTTP_PORT}" ] && [ -z "${HTTPS_PORT}" ]; then
    log "No ports — OpenClaw installed as CLI only."
    DISPLAY_HOST="$HOST_IP"
    [ "$DISPLAY_HOST" = "0.0.0.0" ] || [ -z "$DISPLAY_HOST" ] && DISPLAY_HOST=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
    cat > "$STATE_FILE" <<EOF
{"installed":true,"service_name":"${SERVICE_NAME}","install_dir":"${INSTALL_DIR}","host":"${HOST_IP}","deploy_mode":"os","running":false,"openclaw_cmd":"${OPENCLAW_CMD}"}
EOF
    exit 0
fi

# ── Step 5: Run onboarding if needed ────────────────────────────────────────
if [ -n "$OPENCLAW_CMD" ]; then
    log "Running OpenClaw onboarding..."
    "$OPENCLAW_CMD" onboard --install-daemon 2>&1 || log "Onboarding may need manual completion."
fi

# ── Step 6: Startup script ──────────────────────────────────────────────────
WEB_PORT="${HTTP_PORT:-${HTTPS_PORT}}"
if [ -f "${INSTALL_DIR}/openclaw_web.py" ] && [ -f "$VENV_PYTHON" ]; then
    cat > "${INSTALL_DIR}/start-openclaw-webui.py" <<PYEOF
#!/usr/bin/env python3
import os, sys, ssl, threading
WEB_PORT = int(os.environ.get("OPENCLAW_WEB_PORT", "${WEB_PORT}"))
HTTPS_PORT = os.environ.get("OPENCLAW_HTTPS_PORT", "${HTTPS_PORT}").strip()
CERT_FILE = os.environ.get("OPENCLAW_CERT_FILE", "${CERT_DIR}/openclaw.crt")
KEY_FILE = os.environ.get("OPENCLAW_KEY_FILE", "${CERT_DIR}/openclaw.key")
def run_https(app, port, cf, kf):
    try:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(cf, kf)
        from werkzeug.serving import make_server
        make_server("0.0.0.0", port, app, ssl_context=ctx, threaded=True).serve_forever()
    except Exception as e:
        print(f"HTTPS failed: {e}")
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from openclaw_web import app
    if HTTPS_PORT and HTTPS_PORT.isdigit() and os.path.isfile(CERT_FILE) and os.path.isfile(KEY_FILE):
        threading.Thread(target=run_https, args=(app, int(HTTPS_PORT), CERT_FILE, KEY_FILE), daemon=True).start()
    print(f"OpenClaw Web UI on http://0.0.0.0:{WEB_PORT}")
    app.run(host="0.0.0.0", port=WEB_PORT)
PYEOF
    chmod +x "${INSTALL_DIR}/start-openclaw-webui.py"
fi

# ── Step 7: SSL ─────────────────────────────────────────────────────────────
if [ -n "$HTTPS_PORT" ] && [ "$HTTPS_PORT" != "0" ] && [ ! -f "${CERT_DIR}/openclaw.crt" ]; then
    CN="${DOMAIN:-$HOST_IP}"; [ "$CN" = "0.0.0.0" ] && CN="localhost"
    openssl req -x509 -nodes -newkey rsa:2048 -keyout "${CERT_DIR}/openclaw.key" -out "${CERT_DIR}/openclaw.crt" -days 3650 -subj "/CN=${CN}/O=ServerInstaller/C=US" 2>/dev/null
fi

# ── Step 8: systemd / background ────────────────────────────────────────────
if command -v systemctl &>/dev/null && [ -f "$VENV_PYTHON" ]; then
    cat > "${SYSTEMD_FILE}" <<SVCEOF
[Unit]
Description=OpenClaw Web UI
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment=OPENCLAW_WEB_PORT=${WEB_PORT}
Environment=OPENCLAW_HTTPS_PORT=${HTTPS_PORT}
Environment=OPENCLAW_CERT_FILE=${CERT_DIR}/openclaw.crt
Environment=OPENCLAW_KEY_FILE=${CERT_DIR}/openclaw.key
Environment=OPENCLAW_AUTH_USERNAME=${USERNAME}
Environment=OPENCLAW_AUTH_PASSWORD=${PASSWORD}
ExecStart=${VENV_PYTHON} ${INSTALL_DIR}/start-openclaw-webui.py
Restart=always
RestartSec=5
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}
[Install]
WantedBy=multi-user.target
SVCEOF
    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}" 2>/dev/null || true
    systemctl restart "${SERVICE_NAME}"
    log "Web UI systemd service started."
else
    log "Starting Web UI in background on port ${WEB_PORT}..."
    if [ -f "$VENV_PYTHON" ]; then
        export OPENCLAW_WEB_PORT="${WEB_PORT}"
        "${VENV_PYTHON}" -c "
import subprocess, sys, os
log = open('${LOG_FILE}', 'a')
env = dict(os.environ)
env['OPENCLAW_WEB_PORT'] = '${WEB_PORT}'
env['OPENCLAW_HTTPS_PORT'] = '${HTTPS_PORT}'
env['OPENCLAW_CERT_FILE'] = '${CERT_DIR}/openclaw.crt'
env['OPENCLAW_KEY_FILE'] = '${CERT_DIR}/openclaw.key'
env['OPENCLAW_AUTH_USERNAME'] = '${USERNAME}'
env['OPENCLAW_AUTH_PASSWORD'] = '${PASSWORD}'
p = subprocess.Popen(
    [sys.executable, '${INSTALL_DIR}/start-openclaw-webui.py'],
    cwd='${INSTALL_DIR}', env=env,
    stdout=log, stderr=log,
    start_new_session=True
)
print(f'Started PID {p.pid}')
" 2>&1
        sleep 3
        if curl -sf "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null 2>&1; then
            log "Web UI running on port ${WEB_PORT}."
        else
            log "Web UI may still be starting. Check log: ${LOG_FILE}"
        fi
    fi
fi

# ── Step 9: Firewall ───────────────────────────────────────────────────────
for port in "$HTTP_PORT" "$HTTPS_PORT"; do
    [ -z "$port" ] && continue
    command -v ufw &>/dev/null && ufw allow "$port/tcp" 2>/dev/null || true
    command -v firewall-cmd &>/dev/null && firewall-cmd --permanent --add-port="${port}/tcp" 2>/dev/null || true
done
command -v firewall-cmd &>/dev/null && firewall-cmd --reload 2>/dev/null || true

# ── Step 10: State ──────────────────────────────────────────────────────────
DISPLAY_HOST="$HOST_IP"
[ "$DISPLAY_HOST" = "0.0.0.0" ] || [ -z "$DISPLAY_HOST" ] && DISPLAY_HOST=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
HTTP_URL=""; HTTPS_URL=""
[ -n "$HTTP_PORT" ] && HTTP_URL="http://${DISPLAY_HOST}:${HTTP_PORT}"
[ -n "$HTTPS_PORT" ] && HTTPS_URL="https://${DISPLAY_HOST}:${HTTPS_PORT}"

cat > "$STATE_FILE" <<STEOF
{
    "installed": true, "service_name": "${SERVICE_NAME}",
    "install_dir": "${INSTALL_DIR}", "host": "${HOST_IP}", "domain": "${DOMAIN}",
    "http_port": "${HTTP_PORT}", "https_port": "${HTTPS_PORT}",
    "http_url": "${HTTP_URL}", "https_url": "${HTTPS_URL}",
    "deploy_mode": "os", "running": true,
    "openclaw_cmd": "${OPENCLAW_CMD}",
    "auth_enabled": $([ -n "$USERNAME" ] && echo "true" || echo "false"),
    "auth_username": "${USERNAME}"
}
STEOF

log ""
log "================================================================="
log " OpenClaw Installation Complete!"
log "================================================================="
[ -n "$HTTP_URL" ] && log " Web UI (HTTP):  $HTTP_URL"
[ -n "$HTTPS_URL" ] && log " Web UI (HTTPS): $HTTPS_URL"
[ -n "$OPENCLAW_CMD" ] && log " CLI: $OPENCLAW_CMD --help"
log " OpenClaw Gateway: ws://127.0.0.1:18789"
log " Features: 20+ messaging channels, browser, code exec,"
log "           file management, persistent memory, cron jobs"
log "================================================================="
