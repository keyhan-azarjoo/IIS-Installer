#!/usr/bin/env python3
import argparse
import ctypes
import os
import platform
import socket
import subprocess
import sys
import urllib.request
from pathlib import Path


REPO = "https://raw.githubusercontent.com/keyhan-azarjoo/Server-Installer/main"
DASHBOARD_FILES = [
    "dashboard/server_installer_dashboard.py",
    "dashboard/ui/components.js",
    "dashboard/ui/app.js",
]


def is_repo_layout(root: Path) -> bool:
    return (root / "dashboard" / "server_installer_dashboard.py").exists()


def cache_root() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("ProgramData", "C:/ProgramData"))
        return base / "Server-Installer"
    return Path.home() / ".server-installer"


def ensure_files(root: Path) -> None:
    root.mkdir(parents=True, exist_ok=True)
    for rel in DASHBOARD_FILES:
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        url = f"{REPO}/{rel}"
        tmp_target = target.with_suffix(target.suffix + ".download")
        try:
            print(f"Syncing required file: {rel}")
            urllib.request.urlretrieve(url, tmp_target)
            os.replace(tmp_target, target)
        except Exception as ex:
            if tmp_target.exists():
                tmp_target.unlink(missing_ok=True)
            if not target.exists():
                raise RuntimeError(f"Failed to download required file '{rel}': {ex}") from ex
            print(f"Warning: using cached file for {rel} ({ex})")


def preferred_host(arg_host: str) -> str:
    if arg_host and arg_host not in ("auto", "0.0.0.0"):
        return arg_host
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 53))
        ip = s.getsockname()[0]
        s.close()
        if ip:
            return ip
    except Exception:
        pass
    return "127.0.0.1"


def can_bind(host: str, port: int):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((host, port))
        return True, None
    except OSError as ex:
        return False, ex
    finally:
        sock.close()


def choose_port(bind_host: str, preferred_port: int):
    candidates = []
    for p in [preferred_port, 80, 443]:
        if p and p not in candidates:
            candidates.append(p)

    diagnostics = []
    for port in candidates:
        ok, err = can_bind(bind_host, port)
        if ok:
            return port, diagnostics
        diagnostics.append((port, err))
    return None, diagnostics


def is_windows_admin() -> bool:
    if os.name != "nt":
        return True
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def relaunch_as_admin_if_needed() -> bool:
    if os.name != "nt":
        return False
    if is_windows_admin():
        return False

    params = subprocess.list2cmdline(sys.argv)
    rc = ctypes.windll.shell32.ShellExecuteW(
        None,
        "runas",
        sys.executable,
        params,
        None,
        1,
    )
    if rc <= 32:
        raise RuntimeError("Administrator elevation was required but could not be started.")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="auto")
    parser.add_argument("--port", type=int, default=8090)
    args = parser.parse_args()

    if relaunch_as_admin_if_needed():
        return 0

    cwd_root = Path.cwd()
    if is_repo_layout(cwd_root):
        root = cwd_root
    else:
        root = cache_root()
        ensure_files(root)

    app = root / "dashboard" / "server_installer_dashboard.py"
    if not app.exists():
        print(f"Dashboard script not found: {app}", file=sys.stderr)
        return 1

    display_host = preferred_host(args.host)
    bind_host = args.host
    if (not bind_host) or bind_host in ("auto", "0.0.0.0"):
        bind_host = "0.0.0.0"

    selected_port, diagnostics = choose_port(bind_host, args.port)
    if selected_port is None:
        print("No usable port found for dashboard startup.", file=sys.stderr)
        for port, err in diagnostics:
            print(f"- Port {port}: {err}", file=sys.stderr)
        print("Port checks validate local bind only. For remote access, firewall/security-group must also allow the port.", file=sys.stderr)
        return 1

    if selected_port != args.port:
        print(f"Requested port {args.port} is unavailable. Falling back to {selected_port}.")
    for port, err in diagnostics:
        print(f"Port {port} unavailable: {err}")

    print(f"OS detected: {platform.system()}")
    print(f"Dashboard URL: http://{display_host}:{selected_port}")
    print(f"Local URL: http://127.0.0.1:{selected_port}")
    print("Port checks validate local bind only. For remote access, firewall/security-group must also allow this port.")

    cmd = [sys.executable, str(app), "--host", bind_host, "--port", str(selected_port)]
    return subprocess.call(cmd, cwd=str(root))


if __name__ == "__main__":
    raise SystemExit(main())
