#!/usr/bin/env python3
"""
Proxy Management Panel - Web-based CRM for proxy user management.
Zero external dependencies - uses only Python3 standard library.
"""

import http.server
import socketserver
import ssl
import json
import os
import sys
import subprocess
import time
import hmac
import hashlib
import base64
import threading
import re
import crypt
import struct
import ctypes
import ctypes.util
from urllib.parse import urlparse, parse_qs, unquote
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

# ─── Configuration ────────────────────────────────────────────────────────────

PANEL_DIR = Path("/opt/proxy-panel")
CONFIG_FILE = PANEL_DIR / "panel.conf"
DATA_DIR = PANEL_DIR / "data"
TEMPLATES_DIR = PANEL_DIR / "templates"
STATIC_DIR = PANEL_DIR / "static"
LOG_FILE = "/var/log/proxy-panel.log"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main"
DEFAULT_REPO_ROOT = "/opt/proxy-panel/repo"

LAYER_DEFINITIONS = [
    {
        "id": "layer3-basic",
        "name": "Basic SSH SOCKS",
        "description": "Simple SSH proxy on port 22",
        "needs_domain": False,
        "needs_duckdns": False,
    },
    {
        "id": "layer4-nginx",
        "name": "Nginx TCP Proxy",
        "description": "Nginx stream proxy on port 443",
        "needs_domain": False,
        "needs_duckdns": False,
    },
    {
        "id": "layer6-stunnel",
        "name": "Stunnel TLS Wrapper",
        "description": "SSH over TLS using Stunnel on port 443",
        "needs_domain": False,
        "needs_duckdns": False,
    },
    {
        "id": "layer7-v2ray-vless",
        "name": "V2Ray VLESS (WebSocket)",
        "description": "VLESS protocol with WebSocket transport and self-signed TLS",
        "needs_domain": False,
        "needs_duckdns": False,
    },
    {
        "id": "layer7-v2ray-vmess",
        "name": "V2Ray VMess (TCP)",
        "description": "VMess protocol with TCP transport",
        "needs_domain": False,
        "needs_duckdns": False,
    },
    {
        "id": "layer7-real-domain",
        "name": "V2Ray Real Domain (gRPC)",
        "description": "VLESS + gRPC with real TLS certificate (Let's Encrypt)",
        "needs_domain": True,
        "needs_duckdns": False,
    },
    {
        "id": "layer7-iran-optimized",
        "name": "V2Ray Iran Optimized (gRPC)",
        "description": "VLESS + gRPC tuned for Iranian ISP DPI/throttling",
        "needs_domain": True,
        "needs_duckdns": True,
    },
]

# ─── Logging ──────────────────────────────────────────────────────────────────

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {message}"
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass
    print(line)


def resolve_repo_subdir(repo_root, subdir):
    repo_root = Path(repo_root)
    direct = repo_root / subdir
    if direct.exists():
        return direct
    layered = repo_root / "layers" / subdir
    if layered.exists():
        return layered
    return direct

# ─── Config Management ───────────────────────────────────────────────────────

class Config:
    def __init__(self):
        self.port = 8443
        self.layer = "unknown"
        self.secret_key = os.urandom(32).hex()
        self.session_timeout = 86400
        self.service_type = "ssh"
        self.user_management = "ssh"
        self.xray_stats_port = 10085
        self.scripts_dir = "/opt/proxy-panel/scripts"
        self.repo_root = DEFAULT_REPO_ROOT

    @classmethod
    def load(cls):
        config = cls()
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE) as f:
                    data = json.load(f)
                for key, val in data.items():
                    if hasattr(config, key):
                        setattr(config, key, val)
            except Exception as e:
                log(f"Failed to load config: {e}", "ERROR")
        return config

    def save(self):
        data = {
            "port": self.port,
            "layer": self.layer,
            "secret_key": self.secret_key,
            "session_timeout": self.session_timeout,
            "service_type": self.service_type,
            "user_management": self.user_management,
            "xray_stats_port": self.xray_stats_port,
            "scripts_dir": self.scripts_dir,
            "repo_root": self.repo_root,
        }
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, "w") as f:
            json.dump(data, f, indent=2)

# ─── PAM Authentication ──────────────────────────────────────────────────────

class Authenticator:
    """Authenticate against Linux system credentials."""

    def __init__(self):
        self._pam = None
        self._load_pam()
        self.failed_attempts = defaultdict(list)  # ip -> [timestamps]
        self.lockout_until = {}  # ip -> unlock_time

    def _load_pam(self):
        """Try to load libpam via ctypes."""
        try:
            pam_path = ctypes.util.find_library("pam")
            if pam_path:
                self._pam = ctypes.CDLL(pam_path)
                log("PAM library loaded successfully")
            else:
                log("PAM library not found, using fallback auth", "WARN")
        except Exception as e:
            log(f"Failed to load PAM: {e}", "WARN")

    def is_locked_out(self, ip):
        """Check if IP is locked out."""
        if ip in self.lockout_until:
            if time.time() < self.lockout_until[ip]:
                return True
            else:
                del self.lockout_until[ip]
                self.failed_attempts.pop(ip, None)
        return False

    def record_failure(self, ip):
        """Record a failed login attempt."""
        now = time.time()
        self.failed_attempts[ip] = [
            t for t in self.failed_attempts[ip] if now - t < 600
        ]
        self.failed_attempts[ip].append(now)
        if len(self.failed_attempts[ip]) >= 5:
            self.lockout_until[ip] = now + 900  # 15 min lockout
            log(f"IP {ip} locked out after 5 failed attempts", "WARN")

    def _is_admin_user(self, username):
        """Check if user is root or in sudo/adm group."""
        if username == "root":
            return True
        try:
            result = subprocess.run(
                ["id", "-Gn", username],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                groups = result.stdout.strip().split()
                return any(g in ("sudo", "adm", "wheel", "root") for g in groups)
        except Exception:
            pass
        return False

    def authenticate(self, username, password):
        """Authenticate user against system credentials."""
        if not self._is_admin_user(username):
            return False

        # Try shadow file first (works when running as root)
        try:
            with open("/etc/shadow") as f:
                for line in f:
                    parts = line.strip().split(":")
                    if parts[0] == username and len(parts) > 1:
                        stored_hash = parts[1]
                        if stored_hash in ("!", "*", "!!", ""):
                            return False
                        computed = crypt.crypt(password, stored_hash)
                        return hmac.compare_digest(computed, stored_hash)
        except PermissionError:
            pass
        except Exception as e:
            log(f"Shadow auth error: {e}", "WARN")

        # Fallback: use su command
        try:
            proc = subprocess.run(
                ["su", "-c", "true", username],
                input=password + "\n",
                capture_output=True, text=True, timeout=10
            )
            return proc.returncode == 0
        except Exception as e:
            log(f"su auth error: {e}", "WARN")
            return False

# ─── Session Management ──────────────────────────────────────────────────────

class SessionManager:
    def __init__(self, secret_key, timeout=86400):
        self.secret = bytes.fromhex(secret_key) if isinstance(secret_key, str) else secret_key
        self.timeout = timeout

    def create_token(self, username):
        payload = json.dumps({
            "user": username,
            "exp": time.time() + self.timeout,
            "iat": time.time()
        })
        payload_b64 = base64.b64encode(payload.encode()).decode()
        sig = hmac.new(self.secret, payload.encode(), hashlib.sha256).hexdigest()
        return f"{payload_b64}.{sig}"

    def validate_token(self, token):
        try:
            parts = token.split(".")
            if len(parts) != 2:
                return None
            payload_b64, sig = parts
            payload = base64.b64decode(payload_b64).decode()
            expected_sig = hmac.new(self.secret, payload.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(sig, expected_sig):
                return None
            data = json.loads(payload)
            if data.get("exp", 0) < time.time():
                return None
            return data.get("user")
        except Exception:
            return None

# ─── Layer Detection & User Management ────────────────────────────────────────

class LayerManager:
    def __init__(self, config):
        self.config = config
        self.layer = config.layer

    def detect_layer(self):
        """Auto-detect installed proxy layer."""
        checks = [
            ("layer7-v2ray-vless", self._check_xray_vless),
            ("layer7-v2ray-vmess", self._check_xray_vmess),
            ("layer7-real-domain", self._check_xray_real_domain),
            ("layer6-stunnel", self._check_stunnel),
            ("layer4-nginx", self._check_nginx_stream),
            ("layer3-basic", self._check_basic_ssh),
        ]
        for name, check_fn in checks:
            if check_fn():
                self.layer = name
                return name
        return self.layer

    def _check_xray_vless(self):
        config_path = "/usr/local/etc/xray/config.json"
        if os.path.exists(config_path):
            try:
                with open(config_path) as f:
                    cfg = json.load(f)
                for inb in cfg.get("inbounds", []):
                    if inb.get("protocol") == "vless":
                        server_cfg = "/usr/local/etc/xray/server-config.json"
                        if os.path.exists(server_cfg):
                            with open(server_cfg) as f:
                                sc = json.load(f)
                            if sc.get("domain", "") == "":
                                return True
            except Exception:
                pass
        return False

    def _check_xray_vmess(self):
        config_path = "/usr/local/etc/xray/config.json"
        if os.path.exists(config_path):
            try:
                with open(config_path) as f:
                    cfg = json.load(f)
                for inb in cfg.get("inbounds", []):
                    if inb.get("protocol") == "vmess":
                        return True
            except Exception:
                pass
        return False

    def _check_xray_real_domain(self):
        config_path = "/usr/local/etc/xray/config.json"
        server_cfg = "/usr/local/etc/xray/server-config.json"
        if os.path.exists(config_path) and os.path.exists(server_cfg):
            try:
                with open(server_cfg) as f:
                    sc = json.load(f)
                return sc.get("domain", "") != ""
            except Exception:
                pass
        return False

    def _check_stunnel(self):
        return os.path.exists("/etc/stunnel/stunnel.conf")

    def _check_nginx_stream(self):
        return os.path.exists("/etc/nginx/stream.d/ssh_443.conf")

    def _check_basic_ssh(self):
        return os.path.exists("/root/proxy-installation-info.txt")

    def is_v2ray_layer(self):
        return self.layer.startswith("layer7")

    def get_service_name(self):
        if self.is_v2ray_layer():
            return "xray"
        elif "stunnel" in self.layer:
            return "stunnel4"
        elif "nginx" in self.layer:
            return "nginx"
        return "ssh"

    def list_users(self):
        """List all proxy users."""
        if self.is_v2ray_layer():
            return self._list_v2ray_users()
        else:
            return self._list_ssh_users()

    def _list_ssh_users(self):
        users = []
        connected_users = self._get_ssh_connected_users()
        usage = _bandwidth.get_user_bandwidth() if _bandwidth else {}
        proxy_dir = Path("/root/proxy-users")
        if proxy_dir.exists():
            for f in proxy_dir.glob("*.txt"):
                username = f.stem
                user_info = {"username": username, "type": "ssh", "connected": username in connected_users}
                try:
                    content = f.read_text()
                    for line in content.splitlines():
                        if "Created:" in line:
                            user_info["created"] = line.split("Created:")[-1].strip()
                        if "Password:" in line:
                            user_info["password"] = line.split("Password:")[-1].strip()
                except Exception:
                    pass
                bw = usage.get(username, {})
                user_info["usage_total"] = int(bw.get("uplink", 0) + bw.get("downlink", 0))
                users.append(user_info)
        return users

    def _get_ssh_connected_users(self):
        """Best-effort detection of active SSH sessions per user."""
        connected = set()
        try:
            result = subprocess.run(
                ["ps", "-eo", "user=,cmd="],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0 and result.stdout:
                for line in result.stdout.splitlines():
                    parts = line.strip().split(None, 1)
                    if len(parts) != 2:
                        continue
                    user, cmd = parts
                    if "sshd:" not in cmd:
                        continue
                    match = re.search(r"sshd:\s*([a-zA-Z0-9_-]+)", cmd)
                    if match:
                        connected.add(match.group(1))
                    elif user not in ("root", "sshd"):
                        connected.add(user)
        except Exception:
            pass
        return connected

    def _list_v2ray_users(self):
        users = []
        usage = _bandwidth.get_user_bandwidth() if _bandwidth else {}
        users_file = "/usr/local/etc/xray/users.json"
        if os.path.exists(users_file):
            try:
                with open(users_file) as f:
                    data = json.load(f)
                active_users = self._check_v2ray_users_connected()
                for username, uuid in data.items():
                    users.append({
                        "username": username,
                        "uuid": uuid,
                        "type": "v2ray",
                        "connected": username in active_users,
                        "usage_total": int(usage.get(username, {}).get("uplink", 0) + usage.get(username, {}).get("downlink", 0)),
                    })
            except Exception as e:
                log(f"Error reading users.json: {e}", "ERROR")
        return users

    def _check_v2ray_users_connected(self):
        """Check which V2Ray users have active traffic in the current xray session."""
        connected = set()
        stats_port = self.config.xray_stats_port
        try:
            result = subprocess.run(
                ["xray", "api", "statsquery",
                 f"--server=127.0.0.1:{stats_port}",
                 "-pattern=user>>>"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                data = json.loads(result.stdout)
                for stat in data.get("stat", []):
                    name = stat.get("name", "")
                    value = int(stat.get("value", "0"))
                    match = re.match(r"user>>>(.+)@proxy>>>traffic>>>", name)
                    if match and value > 0:
                        connected.add(match.group(1))
        except Exception:
            pass
        return connected

    def add_user(self, username, password=None):
        """Add a proxy user using existing scripts."""
        if self.is_v2ray_layer():
            return self._add_v2ray_user(username)
        else:
            if not password:
                return {"success": False, "error": "Password required for SSH users"}
            return self._add_ssh_user(username, password)

    def update_user_password(self, username, password):
        """Update password for an existing SSH user."""
        if self.is_v2ray_layer():
            return {"success": False, "error": "Password changes are only supported for SSH users"}
        if not self._ssh_user_exists(username):
            return {"success": False, "error": "User not found"}
        return self._add_ssh_user(username, password)

    def _add_ssh_user(self, username, password):
        script = self._find_script("add-user.sh", "common")
        if not script:
            return {"success": False, "error": "add-user.sh script not found"}
        try:
            result = subprocess.run(
                ["bash", script, username, password],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                log(f"User '{username}' added successfully (SSH)")
                return {"success": True, "output": result.stdout}
            else:
                return {"success": False, "error": result.stderr or result.stdout}
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Script timed out"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _ssh_user_exists(self, username):
        try:
            result = subprocess.run(
                ["id", username],
                capture_output=True, text=True, timeout=5
            )
            return result.returncode == 0
        except Exception:
            return False

    def _add_v2ray_user(self, username):
        # Find the correct add-user.sh for this layer
        layer_dir = self.layer
        script = self._find_script("add-user.sh", layer_dir)
        if not script:
            return {"success": False, "error": "add-user.sh script not found"}
        try:
            result = subprocess.run(
                ["bash", script, username],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                log(f"User '{username}' added successfully (V2Ray)")
                # Return full connection config
                config_result = self.get_user_config(username)
                response = {"success": True, "output": result.stdout}
                if config_result.get("success"):
                    response.update(config_result)
                return response
            else:
                return {"success": False, "error": result.stderr or result.stdout}
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Script timed out"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_user(self, username):
        """Delete a proxy user."""
        if self.is_v2ray_layer():
            return self._delete_v2ray_user(username)
        else:
            return self._delete_ssh_user(username)

    def _delete_ssh_user(self, username):
        script = self._find_script("delete-user.sh", "common")
        if not script:
            return {"success": False, "error": "delete-user.sh script not found"}
        try:
            result = subprocess.run(
                ["bash", script, username],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                log(f"User '{username}' deleted (SSH)")
                return {"success": True, "output": result.stdout}
            else:
                return {"success": False, "error": result.stderr or result.stdout}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _delete_v2ray_user(self, username):
        """Delete V2Ray user by removing from config and users.json."""
        try:
            # Remove from users.json
            users_file = "/usr/local/etc/xray/users.json"
            if os.path.exists(users_file):
                with open(users_file) as f:
                    users = json.load(f)
                uuid = users.pop(username, None)
                if uuid is None:
                    return {"success": False, "error": "User not found"}
                with open(users_file, "w") as f:
                    json.dump(users, f, indent=2)

                # Remove from config.json
                config_file = "/usr/local/etc/xray/config.json"
                if os.path.exists(config_file):
                    with open(config_file) as f:
                        cfg = json.load(f)
                    for inb in cfg.get("inbounds", []):
                        clients = inb.get("settings", {}).get("clients", [])
                        inb["settings"]["clients"] = [
                            c for c in clients if c.get("id") != uuid
                        ]
                    with open(config_file, "w") as f:
                        json.dump(cfg, f, indent=2)

                # Restart xray
                subprocess.run(
                    ["systemctl", "restart", "xray"],
                    capture_output=True, timeout=15
                )
                log(f"User '{username}' deleted (V2Ray)")
                return {"success": True}
            return {"success": False, "error": "Users file not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_user_config(self, username):
        """Get V2Ray user connection configuration with proper transport detection."""
        if not self.is_v2ray_layer():
            return {"success": False, "error": "Not a V2Ray layer"}

        users_file = "/usr/local/etc/xray/users.json"
        server_cfg_file = "/usr/local/etc/xray/server-config.json"
        xray_config_file = "/usr/local/etc/xray/config.json"

        try:
            with open(users_file) as f:
                users = json.load(f)
            uuid = users.get(username)
            if not uuid:
                return {"success": False, "error": "User not found"}

            server_cfg = {}
            if os.path.exists(server_cfg_file):
                with open(server_cfg_file) as f:
                    server_cfg = json.load(f)

            # Detect transport from xray config
            transport = "ws"
            if os.path.exists(xray_config_file):
                with open(xray_config_file) as f:
                    xray_cfg = json.load(f)
                for inb in xray_cfg.get("inbounds", []):
                    if inb.get("protocol") in ("vless", "vmess"):
                        transport = inb.get("streamSettings", {}).get("network", "ws")
                        break

            domain = server_cfg.get("domain", "")
            protocol = server_cfg.get("protocol", "vless")
            server_ip = self._get_server_ip()
            host = domain if domain else server_ip

            if transport == "grpc":
                grpc_service = server_cfg.get("grpc_service", "")
                uri = f"vless://{uuid}@{host}:443?type=grpc&security=tls&serviceName={grpc_service}&sni={host}#{username}"

                stream = {
                    "network": "grpc",
                    "security": "tls",
                    "tlsSettings": {"serverName": host, "allowInsecure": False, "alpn": ["h2"]},
                    "grpcSettings": {"serviceName": grpc_service}
                }
            else:
                ws_path = server_cfg.get("ws_path", "/")
                allow_insecure = not bool(domain)
                uri = f"vless://{uuid}@{host}:443?type=ws&security=tls&path={ws_path}"
                if domain:
                    uri += f"&sni={domain}"
                uri += f"#{username}"

                tls_settings = {"allowInsecure": allow_insecure}
                if domain:
                    tls_settings["serverName"] = domain

                stream = {
                    "network": "ws",
                    "security": "tls",
                    "tlsSettings": tls_settings,
                    "wsSettings": {"path": ws_path}
                }

            vnext = [{"address": host, "port": 443, "users": [{"id": uuid, "encryption": "none"}]}]

            ios_config = {
                "inbounds": [],
                "outbounds": [{
                    "protocol": protocol,
                    "settings": {"vnext": vnext},
                    "streamSettings": stream
                }]
            }

            android_config = {
                "inbounds": [{"port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": {"udp": True}}],
                "outbounds": [{
                    "protocol": protocol,
                    "settings": {"vnext": vnext},
                    "streamSettings": stream
                }]
            }

            return {
                "success": True,
                "uuid": uuid,
                "uri": uri,
                "ios_config": ios_config,
                "android_config": android_config,
                "host": host,
                "protocol": protocol,
                "transport": transport
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _get_server_ip(self):
        try:
            result = subprocess.run(
                ["hostname", "-I"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                ips = result.stdout.strip().split()
                if ips:
                    return ips[0]
        except Exception:
            pass
        try:
            result = subprocess.run(
                ["curl", "-s", "--max-time", "5", "ifconfig.me"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return "SERVER_IP"

    def _find_script(self, name, subdir):
        """Find a management script from local panel/repo copies."""
        # Check scripts dir first
        scripts_dir = Path(self.config.scripts_dir)
        if (scripts_dir / name).exists():
            return str(scripts_dir / name)
        repo_root = Path(self.config.repo_root or DEFAULT_REPO_ROOT)
        repo_path = resolve_repo_subdir(repo_root, subdir) / name
        if repo_path.exists():
            return str(repo_path)
        # Check repo paths
        for base in ["/opt/proxy-panel/scripts", "/root/proxy"]:
            path = Path(base) / subdir / name
            if path.exists():
                return str(path)
            path = Path(base) / name
            if path.exists():
                return str(path)
        return None

    def _download_script(self, name, subdir):
        """Download script from GitHub raw URL and cache locally."""
        url = f"{GITHUB_RAW_BASE}/{subdir}/{name}"
        dest_dir = Path(self.config.scripts_dir)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{subdir}_{name}"
        try:
            result = subprocess.run(
                ["curl", "-fsSL", url, "-o", str(dest)],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                os.chmod(str(dest), 0o755)
                log(f"Downloaded script from {url}")
                return str(dest)
            else:
                log(f"Failed to download script from {url}: {result.stderr}", "ERROR")
        except Exception as e:
            log(f"Failed to download script: {e}", "ERROR")
        return None

    def switch_layer(self, target_layer_id, domain="", email="", duckdns_token=""):
        """Start a layer switch in a background thread."""
        global _switch_state

        with _switch_lock:
            if _switch_state["in_progress"]:
                return {"success": False, "error": "Switch already in progress"}
            _switch_state = {
                "in_progress": True,
                "phase": "starting",
                "target_layer": target_layer_id,
                "progress_pct": 0,
                "log_lines": [],
                "error": "",
            }

        thread = threading.Thread(
            target=self._do_switch,
            args=(target_layer_id, domain, email, duckdns_token),
            daemon=True
        )
        thread.start()
        return {"success": True, "message": "Layer switch started"}

    def _do_switch(self, target_layer_id, domain, email, duckdns_token):
        """Background worker: uninstall current layer, install new one, reinstall panel."""
        global _switch_state, _config
        state_file = DATA_DIR / "switch_state.json"
        repo_root = Path(self.config.repo_root or DEFAULT_REPO_ROOT)
        uninstall_script = repo_root / "common" / "uninstall.sh"
        install_script = repo_root / "layers" / target_layer_id / "install.sh"
        panel_script = repo_root / "panel" / "install-panel.sh"

        def update(phase, pct, line=""):
            _switch_state["phase"] = phase
            _switch_state["progress_pct"] = pct
            if line:
                _switch_state["log_lines"].append(line)
                log(f"[switch] {line}")
            try:
                DATA_DIR.mkdir(parents=True, exist_ok=True)
                with open(state_file, "w") as f:
                    json.dump({
                        "target_layer": target_layer_id,
                        "phase": phase,
                        "progress_pct": pct,
                        "log_lines": _switch_state["log_lines"][-40:],
                        "repo_root": str(repo_root),
                    }, f)
            except Exception as ex:
                log(f"Failed to persist switch state: {ex}", "WARN")

        env = {
            **os.environ,
            "DEBIAN_FRONTEND": "noninteractive",
            "PROXY_REPO_ROOT": str(repo_root),
            "PROXY_SKIP_PANEL_INSTALL": "1",
        }

        try:
            for required in (uninstall_script, install_script, panel_script):
                if not required.exists():
                    raise RuntimeError(f"Required local script not found: {required}")

            # Phase 1: Uninstall current layer
            update("uninstalling", 5, "Running local uninstall script...")
            result = subprocess.run(
                ["bash", str(uninstall_script)],
                capture_output=True, text=True, timeout=300, env=env
            )
            if result.returncode != 0:
                raise RuntimeError(f"Uninstall failed: {result.stderr[-500:]}")
            update("uninstalling", 20, "Uninstall complete")

            # Phase 2: Install target layer
            update("installing", 25, f"Running local installer for {target_layer_id}...")

            layer_def = next((l for l in LAYER_DEFINITIONS if l["id"] == target_layer_id), None)
            needs_domain = layer_def and layer_def["needs_domain"]

            if needs_domain:
                stdin_lines = f"{domain}\n{email}\n"
                if duckdns_token:
                    stdin_lines += f"{duckdns_token}\n"
                else:
                    stdin_lines += "\n"
                update("installing", 30, f"Installing {target_layer_id} (domain: {domain})...")
                result = subprocess.run(
                    ["bash", str(install_script)],
                    input=stdin_lines,
                    capture_output=True, text=True, timeout=600, env=env
                )
            else:
                update("installing", 30, f"Installing {target_layer_id}...")
                result = subprocess.run(
                    ["bash", str(install_script)],
                    capture_output=True, text=True, timeout=600, env=env
                )

            if result.returncode != 0:
                raise RuntimeError(f"Install failed: {result.stderr[-500:]}")
            update("installing", 80, "Layer installation complete")

            # Phase 3: Reinstall panel with new layer flag
            update("reinstalling_panel", 85, "Reinstalling panel from local repo...")
            result = subprocess.run(
                ["bash", str(panel_script), f"--layer={target_layer_id}", f"--repo-root={repo_root}"],
                capture_output=True, text=True, timeout=300, env=env
            )
            if result.returncode != 0:
                raise RuntimeError(f"Panel reinstall failed: {result.stderr[-200:]}")

            # Phase 4: Update in-memory state
            update("finalizing", 95, "Updating configuration...")
            _config = Config.load()
            detected = self.detect_layer()
            _config.layer = detected
            self.layer = detected
            if detected.startswith("layer7"):
                _config.service_type = "xray"
                _config.user_management = "v2ray"
            else:
                _config.service_type = "ssh"
                _config.user_management = "ssh"
            _config.save()

            panel_ready = False
            for _ in range(20):
                status = subprocess.run(
                    ["systemctl", "is-active", "proxy-panel"],
                    capture_output=True, text=True, timeout=10
                )
                if status.returncode == 0:
                    panel_ready = True
                    break
                time.sleep(2)
            if not panel_ready:
                raise RuntimeError("proxy-panel service did not become active after reinstall")
            if detected != target_layer_id:
                raise RuntimeError(f"Layer verification failed: detected '{detected}' after installing '{target_layer_id}'")

            update("done", 100, f"Successfully switched to {target_layer_id}")
            _switch_state["in_progress"] = False

        except Exception as e:
            _switch_state["phase"] = "error"
            _switch_state["error"] = str(e)
            _switch_state["in_progress"] = False
            _switch_state["log_lines"].append(f"ERROR: {e}")
            log(f"Layer switch failed: {e}", "ERROR")

# ─── System Information ───────────────────────────────────────────────────────

class SystemInfo:
    @staticmethod
    def get_info():
        info = {
            "ip": "",
            "uptime": "",
            "os": "",
            "hostname": "",
            "cpu_usage": 0,
            "memory": {"total": 0, "used": 0, "percent": 0},
            "disk": {"total": 0, "used": 0, "percent": 0},
        }
        try:
            # IP
            result = subprocess.run(["hostname", "-I"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                ips = result.stdout.strip().split()
                info["ip"] = ips[0] if ips else ""

            # Uptime
            with open("/proc/uptime") as f:
                uptime_sec = float(f.read().split()[0])
            days = int(uptime_sec // 86400)
            hours = int((uptime_sec % 86400) // 3600)
            mins = int((uptime_sec % 3600) // 60)
            info["uptime"] = f"{days}d {hours}h {mins}m"

            # OS
            result = subprocess.run(
                ["lsb_release", "-ds"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                info["os"] = result.stdout.strip().strip('"')

            # Hostname
            result = subprocess.run(["hostname"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                info["hostname"] = result.stdout.strip()

            # CPU
            with open("/proc/stat") as f:
                line = f.readline()
            parts = line.split()
            idle = int(parts[4])
            total = sum(int(p) for p in parts[1:])
            info["cpu_usage"] = round(100 * (1 - idle / total), 1) if total else 0

            # Memory
            with open("/proc/meminfo") as f:
                meminfo = f.read()
            total_match = re.search(r"MemTotal:\s+(\d+)", meminfo)
            avail_match = re.search(r"MemAvailable:\s+(\d+)", meminfo)
            if total_match and avail_match:
                total_kb = int(total_match.group(1))
                avail_kb = int(avail_match.group(1))
                used_kb = total_kb - avail_kb
                info["memory"] = {
                    "total": round(total_kb / 1048576, 1),
                    "used": round(used_kb / 1048576, 1),
                    "percent": round(100 * used_kb / total_kb, 1) if total_kb else 0
                }

            # Disk
            result = subprocess.run(
                ["df", "-B1", "/"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                lines = result.stdout.strip().splitlines()
                if len(lines) >= 2:
                    parts = lines[1].split()
                    total_bytes = int(parts[1])
                    used_bytes = int(parts[2])
                    info["disk"] = {
                        "total": round(total_bytes / (1024**3), 1),
                        "used": round(used_bytes / (1024**3), 1),
                        "percent": round(100 * used_bytes / total_bytes, 1) if total_bytes else 0
                    }
        except Exception as e:
            log(f"Error getting system info: {e}", "ERROR")

        return info

    @staticmethod
    def get_service_status(service_name):
        """Get systemd service status."""
        try:
            result = subprocess.run(
                ["systemctl", "is-active", service_name],
                capture_output=True, text=True, timeout=5
            )
            return result.stdout.strip()
        except Exception:
            return "unknown"

    @staticmethod
    def get_all_services_status():
        services = {}
        for svc in ["ssh", "sshd", "nginx", "stunnel4", "xray"]:
            status = SystemInfo.get_service_status(svc)
            if status != "unknown" or svc in ("ssh", "xray"):
                services[svc] = status
        return services

# ─── Bandwidth Monitoring ─────────────────────────────────────────────────────

class BandwidthMonitor:
    def __init__(self, config):
        self.config = config
        self.data_file = DATA_DIR / "bandwidth.json"
        self._data = self._load_data()

    def _load_data(self):
        if self.data_file.exists():
            try:
                with open(self.data_file) as f:
                    return json.load(f)
            except Exception:
                pass
        return {"users": {}, "daily": {}, "last_update": 0, "last_reset_day": ""}

    def _save_data(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        try:
            with open(self.data_file, "w") as f:
                json.dump(self._data, f, indent=2)
        except Exception as e:
            log(f"Error saving bandwidth data: {e}", "ERROR")

    def get_system_bandwidth(self):
        """Get system-wide bandwidth from vnstat."""
        result = {"today": {"rx": 0, "tx": 0}, "month": {"rx": 0, "tx": 0}, "total": {"rx": 0, "tx": 0}}
        try:
            # Try vnstat JSON output
            proc = subprocess.run(
                ["vnstat", "--json"],
                capture_output=True, text=True, timeout=10
            )
            if proc.returncode == 0:
                data = json.loads(proc.stdout)
                interfaces = data.get("interfaces", [])
                if interfaces:
                    iface = interfaces[0]
                    traffic = iface.get("traffic", {})

                    # Today
                    days = traffic.get("day", [])
                    if days:
                        today = days[-1]
                        result["today"]["rx"] = today.get("rx", 0)
                        result["today"]["tx"] = today.get("tx", 0)

                    # This month
                    months = traffic.get("month", [])
                    if months:
                        month = months[-1]
                        result["month"]["rx"] = month.get("rx", 0)
                        result["month"]["tx"] = month.get("tx", 0)

                    # Total
                    total = traffic.get("total", {})
                    result["total"]["rx"] = total.get("rx", 0)
                    result["total"]["tx"] = total.get("tx", 0)
        except FileNotFoundError:
            log("vnstat not installed", "WARN")
        except Exception as e:
            log(f"Error getting system bandwidth: {e}", "ERROR")

        return result

    def get_user_bandwidth(self):
        """Get per-user bandwidth with daily breakdown and period summaries."""
        # Ensure fresh data by persisting if stale (> 60s since last persist)
        last_update = self._data.get("last_update", 0)
        if time.time() - last_update > 60:
            try:
                self.persist_stats()
            except Exception as e:
                log(f"Error persisting stats on demand: {e}", "ERROR")

        if self.config.user_management == "v2ray":
            raw = self._get_xray_user_bandwidth()
        else:
            raw = self._get_ssh_user_bandwidth()

        today = datetime.now().strftime("%Y-%m-%d")
        daily = self._data.get("daily", {})
        now = datetime.now()
        week_start = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        month_start = (now - timedelta(days=30)).strftime("%Y-%m-%d")

        for username, data in raw.items():
            user_daily = daily.get(username, {})

            # Today
            today_data = user_daily.get(today, {"uplink": 0, "downlink": 0})
            data["today_uplink"] = today_data.get("uplink", 0)
            data["today_downlink"] = today_data.get("downlink", 0)
            data["today_total"] = data["today_uplink"] + data["today_downlink"]

            # This week (last 7 days)
            week_up = 0
            week_down = 0
            for day_key, day_data in user_daily.items():
                if day_key >= week_start:
                    week_up += day_data.get("uplink", 0)
                    week_down += day_data.get("downlink", 0)
            data["week_uplink"] = week_up
            data["week_downlink"] = week_down
            data["week_total"] = week_up + week_down

            # This month (last 30 days)
            month_up = 0
            month_down = 0
            for day_key, day_data in user_daily.items():
                if day_key >= month_start:
                    month_up += day_data.get("uplink", 0)
                    month_down += day_data.get("downlink", 0)
            data["month_uplink"] = month_up
            data["month_downlink"] = month_down
            data["month_total"] = month_up + month_down

            # Include daily breakdown for frontend charts
            data["daily"] = user_daily

        return raw

    @staticmethod
    def _read_iptables_chain_bytes(table, chain):
        """Return a list of byte counters for rules in a chain or None if chain missing."""
        try:
            cmd = ["iptables"]
            if table:
                cmd += ["-t", table]
            cmd += ["-L", chain, "-v", "-n", "-x"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if result.returncode != 0:
                return None
            lines = result.stdout.splitlines()[2:]
            bytes_list = []
            for line in lines:
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        bytes_list.append(int(parts[1]))
                    except ValueError:
                        continue
            return bytes_list
        except Exception:
            return None

    def _get_xray_user_bandwidth(self):
        """Get V2Ray per-user bandwidth from current xray session + accumulated data."""
        users = {}
        users_file = "/usr/local/etc/xray/users.json"
        if not os.path.exists(users_file):
            return users

        try:
            with open(users_file) as f:
                user_data = json.load(f)

            # Include current session stats so usage shows immediately
            current_stats = self._get_raw_xray_stats()

            for username in user_data:
                persistent = self._data.get("users", {}).get(username, {})
                current = current_stats.get(username, {})
                users[username] = {
                    "uplink": current.get("uplink", 0) + persistent.get("uplink_acc", 0),
                    "downlink": current.get("downlink", 0) + persistent.get("downlink_acc", 0),
                }
        except Exception as e:
            log(f"Error getting xray user bandwidth: {e}", "ERROR")

        return users

    def _get_ssh_user_bandwidth(self):
        """Get SSH per-user bandwidth from iptables accounting."""
        users = {}
        proxy_dir = Path("/root/proxy-users")
        if not proxy_dir.exists():
            return users

        for f in proxy_dir.glob("*.txt"):
            username = f.stem
            uplink = 0
            downlink = 0

            try:
                out_bytes = self._read_iptables_chain_bytes("mangle", f"PROXY_USER_{username}_OUT")
                in_bytes = self._read_iptables_chain_bytes("mangle", f"PROXY_USER_{username}_IN")

                if out_bytes:
                    uplink = out_bytes[0]
                if in_bytes:
                    downlink = in_bytes[0]

                if out_bytes is None and in_bytes is None:
                    legacy = self._read_iptables_chain_bytes("filter", f"PROXY_USER_{username}")
                    if legacy:
                        uplink = legacy[0] if len(legacy) >= 1 else 0
                        downlink = legacy[1] if len(legacy) >= 2 else 0
                        if len(legacy) > 2:
                            downlink += sum(legacy[2:])
            except Exception:
                pass

            persistent = self._data.get("users", {}).get(username, {})
            users[username] = {
                "uplink": uplink + persistent.get("uplink_acc", 0),
                "downlink": downlink + persistent.get("downlink_acc", 0),
            }

        return users

    def persist_stats(self):
        """Persist current stats to survive restarts and track daily usage."""
        today = datetime.now().strftime("%Y-%m-%d")

        # Reset daily counters if new day
        last_day = self._data.get("last_reset_day", "")
        if today != last_day:
            self._data["last_reset_day"] = today

        # Get raw session stats (without accumulated)
        if self.config.user_management == "v2ray":
            raw_stats = self._get_raw_xray_stats()
        else:
            raw_stats = self._get_raw_ssh_stats()

        if "daily" not in self._data:
            self._data["daily"] = {}

        # Track previous session values to compute deltas
        prev_session = self._data.get("prev_session", {})

        for username, stats in raw_stats.items():
            up = stats.get("uplink", 0)
            down = stats.get("downlink", 0)

            # Compute delta from last collection
            prev = prev_session.get(username, {"uplink": 0, "downlink": 0})
            delta_up = max(0, up - prev.get("uplink", 0))
            delta_down = max(0, down - prev.get("downlink", 0))

            # If session counter reset (e.g. service restart), use full value
            if up < prev.get("uplink", 0):
                delta_up = up
            if down < prev.get("downlink", 0):
                delta_down = down

            # Update accumulated totals
            if username not in self._data["users"]:
                self._data["users"][username] = {"uplink_acc": 0, "downlink_acc": 0}
            self._data["users"][username]["uplink_acc"] += delta_up
            self._data["users"][username]["downlink_acc"] += delta_down

            # Update daily totals
            if username not in self._data["daily"]:
                self._data["daily"][username] = {}
            if today not in self._data["daily"][username]:
                self._data["daily"][username][today] = {"uplink": 0, "downlink": 0}
            self._data["daily"][username][today]["uplink"] += delta_up
            self._data["daily"][username][today]["downlink"] += delta_down

            # Clean old daily data (keep 30 days)
            user_days = self._data["daily"][username]
            cutoff = (datetime.now().timestamp() - 30 * 86400)
            for day_key in list(user_days.keys()):
                try:
                    day_ts = datetime.strptime(day_key, "%Y-%m-%d").timestamp()
                    if day_ts < cutoff:
                        del user_days[day_key]
                except ValueError:
                    pass

        # Store current session values for next delta calculation
        self._data["prev_session"] = raw_stats
        self._data["last_update"] = time.time()
        self._save_data()

    def _get_raw_xray_stats(self):
        """Get raw Xray session stats (without accumulated data)."""
        users = {}
        users_file = "/usr/local/etc/xray/users.json"
        if not os.path.exists(users_file):
            return users

        try:
            with open(users_file) as f:
                user_data = json.load(f)

            stats_port = self.config.xray_stats_port
            for username in user_data:
                email = f"{username}@proxy"
                uplink = 0
                downlink = 0

                try:
                    result = subprocess.run(
                        ["xray", "api", "statsquery",
                         f"--server=127.0.0.1:{stats_port}",
                         f"-pattern=user>>>{email}>>>traffic>>>uplink"],
                        capture_output=True, text=True, timeout=10
                    )
                    if result.returncode == 0:
                        match = re.search(r'"value":\s*"?(\d+)"?', result.stdout)
                        if match:
                            uplink = int(match.group(1))
                except Exception:
                    pass

                try:
                    result = subprocess.run(
                        ["xray", "api", "statsquery",
                         f"--server=127.0.0.1:{stats_port}",
                         f"-pattern=user>>>{email}>>>traffic>>>downlink"],
                        capture_output=True, text=True, timeout=10
                    )
                    if result.returncode == 0:
                        match = re.search(r'"value":\s*"?(\d+)"?', result.stdout)
                        if match:
                            downlink = int(match.group(1))
                except Exception:
                    pass

                users[username] = {"uplink": uplink, "downlink": downlink}
        except Exception as e:
            log(f"Error getting raw xray stats: {e}", "ERROR")

        return users

    def _get_raw_ssh_stats(self):
        """Get raw SSH session stats from iptables (without accumulated data)."""
        users = {}
        proxy_dir = Path("/root/proxy-users")
        if not proxy_dir.exists():
            return users

        for f in proxy_dir.glob("*.txt"):
            username = f.stem
            uplink = 0
            downlink = 0

            try:
                out_bytes = self._read_iptables_chain_bytes("mangle", f"PROXY_USER_{username}_OUT")
                in_bytes = self._read_iptables_chain_bytes("mangle", f"PROXY_USER_{username}_IN")

                if out_bytes:
                    uplink = out_bytes[0]
                if in_bytes:
                    downlink = in_bytes[0]

                if out_bytes is None and in_bytes is None:
                    legacy = self._read_iptables_chain_bytes("filter", f"PROXY_USER_{username}")
                    if legacy:
                        uplink = legacy[0] if len(legacy) >= 1 else 0
                        downlink = legacy[1] if len(legacy) >= 2 else 0
                        if len(legacy) > 2:
                            downlink += sum(legacy[2:])
            except Exception:
                pass

            users[username] = {"uplink": uplink, "downlink": downlink}

        return users

    def get_connections(self):
        """Get active connections."""
        connections = []
        try:
            result = subprocess.run(
                ["ss", "-tnp"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                for line in result.stdout.splitlines()[1:]:
                    parts = line.split()
                    if len(parts) >= 5:
                        state = parts[0]
                        local = parts[3]
                        remote = parts[4]
                        # Filter for proxy port connections
                        if ":443" in local or ":22" in local:
                            connections.append({
                                "state": state,
                                "local": local,
                                "remote": remote,
                                "process": parts[5] if len(parts) > 5 else ""
                            })
        except Exception as e:
            log(f"Error getting connections: {e}", "ERROR")
        return connections

# ─── Background Bandwidth Collector ───────────────────────────────────────────

class BandwidthCollector(threading.Thread):
    def __init__(self, bandwidth_monitor):
        super().__init__(daemon=True)
        self.monitor = bandwidth_monitor

    def run(self):
        while True:
            try:
                self.monitor.persist_stats()
            except Exception as e:
                log(f"Bandwidth collector error: {e}", "ERROR")
            time.sleep(300)  # Every 5 minutes

# ─── HTTP Request Handler ─────────────────────────────────────────────────────

# Global references (set in main())
_config = None
_auth = None
_sessions = None
_layer_mgr = None
_bandwidth = None

# Layer switch state (tracked across background thread)
_switch_state = {
    "in_progress": False,
    "phase": "",
    "target_layer": "",
    "progress_pct": 0,
    "log_lines": [],
    "error": "",
}
_switch_lock = threading.Lock()

class PanelHandler(http.server.BaseHTTPRequestHandler):
    """Main HTTP request handler with routing."""

    def log_message(self, format, *args):
        """Override default logging."""
        pass

    def _get_client_ip(self):
        return self.client_address[0]

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html, status=200):
        body = html.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, filepath, content_type):
        try:
            with open(filepath, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_error(404)

    def _redirect(self, location):
        self.send_response(302)
        self.send_header("Location", location)
        self.end_headers()

    def _get_session_user(self):
        cookies = self.headers.get("Cookie", "")
        for part in cookies.split(";"):
            part = part.strip()
            if part.startswith("session="):
                token = part[len("session="):]
                return _sessions.validate_token(token)
        return None

    def _require_auth(self):
        user = self._get_session_user()
        if not user:
            return None
        return user

    def _check_csrf(self):
        return self.headers.get("X-Requested-With") == "XMLHttpRequest"

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > 0:
            return self.rfile.read(length)
        return b""

    # ── Routes ────────────────────────────────────────────────────────────────

    def do_GET(self):
        path = urlparse(self.path).path

        # Static files
        if path.startswith("/static/"):
            filename = path[len("/static/"):]
            # Prevent directory traversal
            if ".." in filename or filename.startswith("/"):
                self.send_error(403)
                return
            filepath = STATIC_DIR / filename
            ext = filepath.suffix.lower()
            content_types = {
                ".css": "text/css",
                ".js": "application/javascript",
                ".ico": "image/x-icon",
                ".png": "image/png",
                ".svg": "image/svg+xml",
            }
            self._send_file(str(filepath), content_types.get(ext, "application/octet-stream"))
            return

        # Pages
        if path == "/" or path == "/login":
            if self._get_session_user():
                self._redirect("/dashboard")
            else:
                self._send_file(str(TEMPLATES_DIR / "login.html"), "text/html; charset=utf-8")
            return

        if path == "/dashboard":
            if not self._get_session_user():
                self._redirect("/login")
            else:
                self._send_file(str(TEMPLATES_DIR / "dashboard.html"), "text/html; charset=utf-8")
            return

        # API endpoints
        if path.startswith("/api/"):
            self._handle_api_get(path)
            return

        self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/login":
            self._handle_login()
            return

        if path == "/api/logout":
            self._handle_logout()
            return

        # All other POST endpoints require auth + CSRF
        user = self._require_auth()
        if not user:
            self._send_json({"error": "Unauthorized"}, 401)
            return
        if not self._check_csrf():
            self._send_json({"error": "CSRF check failed"}, 403)
            return

        if path == "/api/users":
            self._handle_add_user()
        elif path.startswith("/api/users/") and path.endswith("/password"):
            username = path[len("/api/users/"):-len("/password")]
            self._handle_update_password(unquote(username))
        elif path == "/api/service/restart":
            self._handle_service_restart()
        elif path == "/api/layer/switch":
            self._handle_layer_switch()
        elif path == "/api/layer/switch/clear":
            self._handle_switch_clear()
        else:
            self.send_error(404)

    def do_DELETE(self):
        path = urlparse(self.path).path
        user = self._require_auth()
        if not user:
            self._send_json({"error": "Unauthorized"}, 401)
            return
        if not self._check_csrf():
            self._send_json({"error": "CSRF check failed"}, 403)
            return

        # DELETE /api/users/<username>
        match = re.match(r"^/api/users/([a-zA-Z0-9_-]+)$", path)
        if match:
            username = match.group(1)
            self._handle_delete_user(username)
        else:
            self.send_error(404)

    # ── API GET Handlers ──────────────────────────────────────────────────────

    def _handle_api_get(self, path):
        user = self._require_auth()
        if not user:
            self._send_json({"error": "Unauthorized"}, 401)
            return

        if path == "/api/system/info":
            info = SystemInfo.get_info()
            info["layer"] = _layer_mgr.layer
            info["service"] = _layer_mgr.get_service_name()
            self._send_json(info)

        elif path == "/api/system/status":
            self._send_json(SystemInfo.get_all_services_status())

        elif path == "/api/users":
            self._send_json(_layer_mgr.list_users())

        elif path.startswith("/api/users/") and path.endswith("/config"):
            username = path[len("/api/users/"):-len("/config")]
            username = unquote(username)
            self._send_json(_layer_mgr.get_user_config(username))

        elif path == "/api/bandwidth/system":
            self._send_json(_bandwidth.get_system_bandwidth())

        elif path == "/api/bandwidth/users":
            self._send_json(_bandwidth.get_user_bandwidth())

        elif path == "/api/connections":
            self._send_json(_bandwidth.get_connections())

        elif path == "/api/service/logs":
            self._handle_service_logs()

        elif path == "/api/layers":
            layers = []
            for layer_def in LAYER_DEFINITIONS:
                layers.append({
                    **layer_def,
                    "active": layer_def["id"] == _layer_mgr.layer,
                })
            self._send_json({"layers": layers, "current": _layer_mgr.layer})

        elif path == "/api/layer/switch/status":
            self._send_json({
                "in_progress": _switch_state["in_progress"],
                "phase": _switch_state["phase"],
                "target_layer": _switch_state["target_layer"],
                "progress_pct": _switch_state["progress_pct"],
                "log_lines": _switch_state["log_lines"][-20:],
                "error": _switch_state["error"],
            })

        else:
            self.send_error(404)

    # ── API POST/DELETE Handlers ──────────────────────────────────────────────

    def _handle_login(self):
        ip = self._get_client_ip()
        if _auth.is_locked_out(ip):
            self._send_json({"error": "Too many failed attempts. Try again later."}, 429)
            return

        try:
            body = json.loads(self._read_body())
        except Exception:
            self._send_json({"error": "Invalid request"}, 400)
            return

        username = body.get("username", "").strip()
        password = body.get("password", "")

        if not username or not password:
            self._send_json({"error": "Username and password required"}, 400)
            return

        if _auth.authenticate(username, password):
            token = _sessions.create_token(username)
            log(f"Login successful: {username} from {ip}")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header(
                "Set-Cookie",
                f"session={token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400"
            )
            body = json.dumps({"success": True, "user": username}).encode()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            _auth.record_failure(ip)
            log(f"Login failed: {username} from {ip}", "WARN")
            self._send_json({"error": "Invalid credentials"}, 401)

    def _handle_logout(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header(
            "Set-Cookie",
            "session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
        )
        body = json.dumps({"success": True}).encode()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_add_user(self):
        try:
            body = json.loads(self._read_body())
        except Exception:
            self._send_json({"error": "Invalid request"}, 400)
            return

        username = body.get("username", "").strip()
        password = body.get("password", "")

        # Validate username
        if not re.match(r"^[a-zA-Z0-9_-]{3,32}$", username):
            self._send_json({
                "error": "Invalid username. Use 3-32 alphanumeric characters, dash, or underscore."
            }, 400)
            return

        # Validate password for SSH layers
        if not _layer_mgr.is_v2ray_layer():
            if len(password) < 8:
                self._send_json({"error": "Password must be at least 8 characters"}, 400)
                return

        result = _layer_mgr.add_user(username, password if password else None)
        status = 200 if result.get("success") else 400
        self._send_json(result, status)

    def _handle_delete_user(self, username):
        if not re.match(r"^[a-zA-Z0-9_-]{3,32}$", username):
            self._send_json({"error": "Invalid username"}, 400)
            return
        result = _layer_mgr.delete_user(username)
        status = 200 if result.get("success") else 400
        self._send_json(result, status)

    def _handle_update_password(self, username):
        try:
            body = json.loads(self._read_body())
        except Exception:
            self._send_json({"error": "Invalid request"}, 400)
            return

        password = body.get("password", "")

        if not re.match(r"^[a-zA-Z0-9_-]{3,32}$", username):
            self._send_json({"error": "Invalid username"}, 400)
            return

        if len(password) < 8:
            self._send_json({"error": "Password must be at least 8 characters"}, 400)
            return

        result = _layer_mgr.update_user_password(username, password)
        status = 200 if result.get("success") else 400
        self._send_json(result, status)

    def _handle_service_restart(self):
        service = _layer_mgr.get_service_name()
        try:
            result = subprocess.run(
                ["systemctl", "restart", service],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0:
                log(f"Service '{service}' restarted via panel")
                self._send_json({"success": True, "service": service})
            else:
                self._send_json({"success": False, "error": result.stderr}, 500)
        except Exception as e:
            self._send_json({"success": False, "error": str(e)}, 500)

    def _handle_layer_switch(self):
        try:
            body = json.loads(self._read_body())
        except Exception:
            self._send_json({"error": "Invalid request"}, 400)
            return

        target = body.get("layer_id", "").strip()
        domain = body.get("domain", "").strip()
        email = body.get("email", "").strip()
        duckdns_token = body.get("duckdns_token", "").strip()

        # Validate layer_id
        valid_ids = [l["id"] for l in LAYER_DEFINITIONS]
        if target not in valid_ids:
            self._send_json({"error": "Invalid layer ID"}, 400)
            return

        if target == _layer_mgr.layer:
            self._send_json({"error": "Already on this layer"}, 400)
            return

        # Validate domain/email for layers that need it
        layer_def = next(l for l in LAYER_DEFINITIONS if l["id"] == target)
        if layer_def["needs_domain"]:
            if not domain or not email:
                self._send_json({"error": "Domain and email are required for this layer"}, 400)
                return
            if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$', domain):
                self._send_json({"error": "Invalid domain format"}, 400)
                return
            if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
                self._send_json({"error": "Invalid email format"}, 400)
                return

        result = _layer_mgr.switch_layer(target, domain, email, duckdns_token)
        status = 200 if result.get("success") else 400
        self._send_json(result, status)

    def _handle_switch_clear(self):
        """Reset switch state and clean up state file."""
        global _switch_state
        _switch_state = {
            "in_progress": False,
            "phase": "",
            "target_layer": "",
            "progress_pct": 0,
            "log_lines": [],
            "error": "",
        }
        state_file = DATA_DIR / "switch_state.json"
        if state_file.exists():
            try:
                os.unlink(str(state_file))
            except Exception:
                pass
        self._send_json({"success": True})

    def _handle_service_logs(self):
        service = _layer_mgr.get_service_name()
        try:
            result = subprocess.run(
                ["journalctl", "-u", service, "-n", "100", "--no-pager"],
                capture_output=True, text=True, timeout=10
            )
            logs = result.stdout if result.returncode == 0 else "Failed to read logs"
            self._send_json({"logs": logs, "service": service})
        except Exception as e:
            self._send_json({"logs": str(e), "service": service})

def _ensure_xray_client_emails():
    """Patch existing xray clients to add email fields for per-user stats tracking."""
    config_path = "/usr/local/etc/xray/config.json"
    users_file = "/usr/local/etc/xray/users.json"
    if not os.path.exists(config_path) or not os.path.exists(users_file):
        return
    try:
        with open(users_file) as f:
            users = json.load(f)
        with open(config_path) as f:
            cfg = json.load(f)

        # Build uuid->username map
        uuid_to_user = {uuid: name for name, uuid in users.items()}
        changed = False

        for inb in cfg.get("inbounds", []):
            if inb.get("protocol") not in ("vless", "vmess"):
                continue
            for client in inb.get("settings", {}).get("clients", []):
                if not client.get("email"):
                    cid = client.get("id", "")
                    username = uuid_to_user.get(cid, cid[:8])
                    client["email"] = f"{username}@proxy"
                    changed = True

        if changed:
            with open(config_path, "w") as f:
                json.dump(cfg, f, indent=2)
            subprocess.run(
                ["systemctl", "restart", "xray"],
                capture_output=True, timeout=15
            )
            log("Patched xray clients with email fields for stats tracking")
    except Exception as e:
        log(f"Error patching xray client emails: {e}", "ERROR")

# ─── Threaded HTTPS Server ────────────────────────────────────────────────────

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    global _config, _auth, _sessions, _layer_mgr, _bandwidth

    _config = Config.load()
    _auth = Authenticator()
    _sessions = SessionManager(_config.secret_key, _config.session_timeout)
    _layer_mgr = LayerManager(_config)
    _bandwidth = BandwidthMonitor(_config)

    # Always re-detect layer on startup (handles layer changes after reinstall)
    detected = _layer_mgr.detect_layer()
    if detected != _config.layer:
        log(f"Layer changed: {_config.layer} -> {detected}")
    _config.layer = detected
    _layer_mgr.layer = detected
    if detected.startswith("layer7"):
        _config.service_type = "xray"
        _config.user_management = "v2ray"
    else:
        _config.service_type = "ssh"
        _config.user_management = "ssh"
    _config.save()
    log(f"Active layer: {detected}")

    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Recover from a layer switch if panel was restarted during Phase 3
    switch_state_file = DATA_DIR / "switch_state.json"
    if switch_state_file.exists():
        try:
            with open(switch_state_file) as f:
                saved_switch = json.load(f)
            saved_target = saved_switch.get("target_layer", "")
            recovered_phase = "done" if detected == saved_target else "error"
            _switch_state["phase"] = recovered_phase
            _switch_state["progress_pct"] = 100 if recovered_phase == "done" else 0
            _switch_state["target_layer"] = saved_switch.get("target_layer", "")
            _switch_state["log_lines"] = saved_switch.get("log_lines", []) or [f"Recovered switch state for {saved_target or 'unknown'}"]
            if recovered_phase == "done":
                _switch_state["log_lines"].append(f"Successfully switched to {saved_target or 'unknown'}")
            else:
                _switch_state["error"] = f"Recovered switch target '{saved_target}', but detected layer is '{detected}'."
            _switch_state["in_progress"] = False
            log(f"Recovered from layer switch: {saved_switch.get('target_layer')} ({recovered_phase})")
        except Exception as e:
            log(f"Error recovering switch state: {e}", "WARN")

    # Patch existing xray clients to add email fields for stats tracking
    if _config.user_management == "v2ray":
        _ensure_xray_client_emails()

    # Start bandwidth collector
    collector = BandwidthCollector(_bandwidth)
    collector.start()

    # Create HTTPS server
    server = ThreadedHTTPServer(("0.0.0.0", _config.port), PanelHandler)

    # Set up SSL
    cert_file = PANEL_DIR / "certs" / "panel.pem"
    key_file = PANEL_DIR / "certs" / "panel.key"

    if cert_file.exists() and key_file.exists():
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(str(cert_file), str(key_file))
        server.socket = ctx.wrap_socket(server.socket, server_side=True)
        log(f"Panel started on https://0.0.0.0:{_config.port} (HTTPS)")
    else:
        log(f"Panel started on http://0.0.0.0:{_config.port} (HTTP - no certs found)", "WARN")

    log(f"Layer: {_config.layer} | Service: {_config.service_type} | User mgmt: {_config.user_management}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Panel shutting down")
        server.shutdown()

if __name__ == "__main__":
    main()
