cleanup_previous_locals3() {
  local root="/opt/locals3"
  [ "$(detect_os)" = "macos" ] && root="/usr/local/locals3"

  if has_cmd systemctl; then
    systemctl stop locals3-minio >/dev/null 2>&1 || true
    # Do not stop the host nginx service globally; other apps/panels may depend on it.
    systemctl stop locals3-nginx >/dev/null 2>&1 || true
  fi

  # Do not stop brew nginx globally on macOS during LocalS3 cleanup.

  if [ -d "$root" ]; then
    rm -rf "${root}/tmp" >/dev/null 2>&1 || true
  fi
}
