#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-auto}"
PORT="${PORT:-8090}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHER="${SCRIPT_DIR}/dashboard/start-server-dashboard.py"

if [[ ! -f "${LAUNCHER}" ]]; then
  echo "Launcher not found: ${LAUNCHER}" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required. Install python3 and rerun." >&2
  exit 1
fi

export SERVER_INSTALLER_LOCAL_ROOT="${SCRIPT_DIR}"

echo "Using local repo: ${SCRIPT_DIR}"
echo "Starting dashboard launcher..."

exec python3 "${LAUNCHER}" --host "${HOST}" --port "${PORT}"
