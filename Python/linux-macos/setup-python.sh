#!/usr/bin/env bash
set -euo pipefail

REQUESTED_VERSION="${PYTHON_VERSION:-3.12}"
INSTALL_JUPYTER="${PYTHON_INSTALL_JUPYTER:-1}"
JUPYTER_PORT="${PYTHON_JUPYTER_PORT:-8888}"
HOST_IP="${PYTHON_HOST_IP:-}"
BASE_STATE_DIR="${SERVER_INSTALLER_DATA_DIR:-${HOME}/.server-installer}"
STATE_DIR="${BASE_STATE_DIR}/python"
STATE_FILE="${STATE_DIR}/python-state.json"

mkdir -p "${STATE_DIR}"

ensure_python_linux() {
  local major_minor="$1"
  if command -v "python${major_minor}" >/dev/null 2>&1; then
    echo "python${major_minor}"
    return 0
  fi
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y "python${major_minor}" "python${major_minor}-venv" "python${major_minor}-distutils" python3-pip || apt-get install -y python3 python3-venv python3-pip
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y "python${major_minor}" python3-pip || dnf install -y python3 python3-pip
  elif command -v yum >/dev/null 2>&1; then
    yum install -y python3 python3-pip
  elif command -v zypper >/dev/null 2>&1; then
    zypper --non-interactive install python3 python3-pip
  elif command -v pacman >/dev/null 2>&1; then
    pacman -Sy --noconfirm python python-pip
  else
    echo "No supported Linux package manager found." >&2
    return 1
  fi
  command -v "python${major_minor}" >/dev/null 2>&1 && echo "python${major_minor}" && return 0
  command -v python3 >/dev/null 2>&1 && echo "python3" && return 0
  return 1
}

ensure_python_macos() {
  local major_minor="$1"
  if command -v "python${major_minor}" >/dev/null 2>&1; then
    echo "python${major_minor}"
    return 0
  fi
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required to install Python automatically on macOS." >&2
    return 1
  fi
  brew install "python@${major_minor}" || brew install python
  command -v "python${major_minor}" >/dev/null 2>&1 && echo "python${major_minor}" && return 0
  command -v python3 >/dev/null 2>&1 && echo "python3" && return 0
  return 1
}

MAJOR_MINOR="$(printf '%s' "${REQUESTED_VERSION}" | cut -d. -f1,2)"

if [[ "$(uname -s)" == "Darwin" ]]; then
  PYTHON_CMD="$(ensure_python_macos "${MAJOR_MINOR}")"
else
  PYTHON_CMD="$(ensure_python_linux "${MAJOR_MINOR}")"
fi

PYTHON_EXE="$("${PYTHON_CMD}" -c 'import sys; print(sys.executable)')"
PYTHON_VERSION_REAL="$("${PYTHON_CMD}" -c 'import sys; print(sys.version.split()[0])')"
SCRIPTS_DIR="$(dirname "${PYTHON_EXE}")"

"${PYTHON_EXE}" -m ensurepip --upgrade >/dev/null 2>&1 || true
"${PYTHON_EXE}" -m pip install --upgrade pip

if [[ "${INSTALL_JUPYTER,,}" =~ ^(1|true|yes|y|on)$ ]]; then
  "${PYTHON_EXE}" -m pip install --upgrade jupyterlab notebook
  JUPYTER_INSTALLED=true
else
  JUPYTER_INSTALLED=false
fi

cat > "${STATE_FILE}" <<EOF
{
  "requested_version": "${REQUESTED_VERSION}",
  "python_version": "${PYTHON_VERSION_REAL}",
  "python_executable": "${PYTHON_EXE}",
  "scripts_dir": "${SCRIPTS_DIR}",
  "jupyter_installed": ${JUPYTER_INSTALLED},
  "jupyter_port": "${JUPYTER_PORT}",
  "host": "${HOST_IP}",
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "Python ready: ${PYTHON_EXE}"
if [[ "${JUPYTER_INSTALLED}" == "true" ]]; then
  echo "Jupyter packages installed."
fi
