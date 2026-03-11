#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8090}"
HOST="${HOST:-0.0.0.0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_SCRIPT="${SCRIPT_DIR}/../../start-dashboard.sh"

if [[ ! -f "${ROOT_SCRIPT}" ]]; then
  echo "Dashboard launcher not found: ${ROOT_SCRIPT}" >&2
  exit 1
fi

echo "Starting dashboard in HTTPS-only mode..."
HOST="${HOST}" PORT="${PORT}" exec "${ROOT_SCRIPT}"
