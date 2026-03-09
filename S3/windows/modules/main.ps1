function Invoke-LocalS3WindowsSetup {
  Relaunch-Elevated
  Initialize-NetworkDefaults
  Info "===== Local S3 Storage Installer (Windows) ====="

  # Force the selected host/IP from the dashboard so it cannot be overridden
  # by auto-detection or public IP fallbacks.
  try {
    $mode = ($env:LOCALS3_HOST_MODE | ForEach-Object { $_.Trim().ToLowerInvariant() }) 2>$null
    $selectedIp = ($env:LOCALS3_HOST_IP | ForEach-Object { $_.Trim() }) 2>$null
    $customHost = ($env:LOCALS3_HOST | ForEach-Object { $_.Trim() }) 2>$null
    if ($mode -eq "lan" -and $selectedIp) {
      $env:LOCALS3_HOST = $selectedIp
    } elseif ($mode -eq "custom" -and $customHost) {
      $env:LOCALS3_HOST = $customHost
    }
  } catch {}

  $mode = Ask-InstallMode
  if ($mode -eq "iis") {
    Invoke-LocalS3IISSetup
    return
  }

  Invoke-LocalS3DockerSetup
}
