#!/usr/bin/env python3
import argparse
import ctypes
import os
import platform
import signal
import socket
import subprocess
import sys
import time
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


def find_listener_pid_linux(port: int):
    try:
        out = subprocess.check_output(
            ["ss", "-ltnp", f"sport = :{port}"],
            stderr=subprocess.STDOUT,
            text=True,
        )
    except Exception:
        return None

    for line in out.splitlines():
        if "users:((" not in line:
            continue
        marker = "pid="
        idx = line.find(marker)
        if idx == -1:
            continue
        idx += len(marker)
        end = idx
        while end < len(line) and line[end].isdigit():
            end += 1
        if end > idx:
            try:
                return int(line[idx:end])
            except ValueError:
                return None
    return None


def process_cmdline(pid: int):
    try:
        data = Path(f"/proc/{pid}/cmdline").read_bytes()
    except Exception:
        return ""
    return data.replace(b"\x00", b" ").decode("utf-8", errors="ignore")


def is_dashboard_process(pid: int):
    cmd = process_cmdline(pid)
    if not cmd:
        return False
    indicators = [
        "start-server-dashboard.py",
        "server_installer_dashboard.py",
    ]
    return any(ind in cmd for ind in indicators)


def stop_process(pid: int, timeout_sec: float = 3.0):
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        return True
    except Exception:
        return False

    started = time.time()
    while time.time() - started < timeout_sec:
        try:
            os.kill(pid, 0)
            time.sleep(0.1)
        except ProcessLookupError:
            return True
        except Exception:
            break

    try:
        os.kill(pid, signal.SIGKILL)
    except Exception:
        pass

    time.sleep(0.2)
    try:
        os.kill(pid, 0)
        return False
    except ProcessLookupError:
        return True
    except Exception:
        return False


def stop_existing_dashboard_on_port(port: int):
    if os.name == "nt":
        return False, "port pre-clean is only implemented on Linux"
    pid = find_listener_pid_linux(port)
    if not pid:
        return False, "no listener"
    if not is_dashboard_process(pid):
        return False, f"port owned by different process (pid {pid})"
    stopped = stop_process(pid)
    if stopped:
        return True, f"stopped previous dashboard process pid {pid}"
    return False, f"failed to stop previous dashboard process pid {pid}"


def choose_port(bind_host: str, preferred_port: int):
    candidates = []
    for p in [preferred_port, 80, 443]:
        if p and p not in candidates:
            candidates.append(p)

    diagnostics = []
    for port in candidates:
        ok, err = can_bind(bind_host, port)
        diagnostics.append((port, ok, err))
        if ok:
            return port, diagnostics
    return None, diagnostics


def check_local_http(port: int, attempts: int = 8, delay: float = 0.5):
    url = f"http://127.0.0.1:{port}/"
    last_error = None
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                return True, f"{resp.status}"
        except Exception as ex:
            last_error = ex
            time.sleep(delay)
    return False, str(last_error) if last_error else "Unknown error"


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

    preclean_ports = []
    for p in [args.port, 80, 443]:
        if p and p not in preclean_ports:
            preclean_ports.append(p)
    print("Pre-run checks:")
    for p in preclean_ports:
        changed, note = stop_existing_dashboard_on_port(p)
        if changed:
            print(f"- Port {p}: {note}")
        elif note != "no listener":
            print(f"- Port {p}: {note}")

    selected_port, diagnostics = choose_port(bind_host, args.port)
    if selected_port is None:
        print("No usable port found for dashboard startup.", file=sys.stderr)
        for port, ok, err in diagnostics:
            if ok:
                print(f"- Port {port}: available", file=sys.stderr)
            else:
                print(f"- Port {port}: unavailable -> {err}", file=sys.stderr)
        print("Port checks validate local bind only. For remote access, firewall/security-group must also allow the port.", file=sys.stderr)
        return 1

    print("Port checks:")
    for port, ok, err in diagnostics:
        if ok:
            print(f"- Port {port}: available for local bind")
        else:
            print(f"- Port {port}: unavailable ({err})")

    if selected_port != args.port:
        print(f"Requested port {args.port} is unavailable. Falling back to {selected_port}.")

    print(f"OS detected: {platform.system()}")
    print(f"Dashboard URL: http://{display_host}:{selected_port}")
    print(f"Local URL: http://127.0.0.1:{selected_port}")
    print("Port checks validate local bind only. For remote access, firewall/security-group must also allow this port.")

    cmd = [sys.executable, str(app), "--host", bind_host, "--port", str(selected_port)]
    proc = subprocess.Popen(cmd, cwd=str(root))

    ok, detail = check_local_http(selected_port)
    print("Startup diagnostics:")
    print(f"- Bind host: {bind_host}")
    print(f"- Selected port: {selected_port}")
    if ok:
        print(f"- Local HTTP check: PASS (HTTP {detail})")
        print("- If remote access still times out, the blocker is external to the app (UFW/iptables/cloud firewall/security-group).")
    else:
        if proc.poll() is not None:
            print(f"- Local HTTP check: FAIL ({detail})")
            print(f"- Dashboard process exited early with code {proc.returncode}.")
            print("- Read the error lines above for the exact bind/startup failure.")
        else:
            print(f"- Local HTTP check: FAIL ({detail})")
            print("- Process is running but localhost is not responding yet. This usually indicates startup/runtime errors in the dashboard process output.")

    return proc.wait()


if __name__ == "__main__":
    raise SystemExit(main())
