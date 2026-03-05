#!/usr/bin/env python3
import argparse
import os
import platform
import subprocess
import sys
import urllib.request
from pathlib import Path


REPO = "https://raw.githubusercontent.com/keyhan-azarjoo/Server-Installer/main"
REQUIRED_FILES = [
    "dashboard/server_installer_dashboard.py",
    "DotNet/windows/install-windows-dotnet-host.ps1",
    "DotNet/windows/modules/common.ps1",
    "DotNet/windows/modules/iis-mode.ps1",
    "DotNet/windows/modules/docker-mode.ps1",
    "DotNet/linux/install-linux-dotnet-runner.sh",
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
    for rel in REQUIRED_FILES:
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            continue
        url = f"{REPO}/{rel}"
        print(f"Downloading required file: {rel}")
        urllib.request.urlretrieve(url, target)


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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="auto")
    parser.add_argument("--port", type=int, default=8090)
    args = parser.parse_args()

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

    host = preferred_host(args.host)
    print(f"OS detected: {platform.system()}")
    print(f"Dashboard URL: http://{host}:{args.port}")
    print(f"Local URL: http://127.0.0.1:{args.port}")

    cmd = [sys.executable, str(app), "--host", host, "--port", str(args.port)]
    return subprocess.call(cmd, cwd=str(root))


if __name__ == "__main__":
    raise SystemExit(main())
