$ErrorActionPreference = 'Stop'
$root = 'C:\ProgramData\Server-Installer'
$pythonExe = 'C:\Program Files\Python312\pythonw.exe'
$dashboardArgs = @(
  'C:\ProgramData\Server-Installer\dashboard\start-server-dashboard.py',
  '--run-server',
  '--host',
  '0.0.0.0',
  '--port',
  '8090',
  '--https',
  '--cert',
  'C:\ProgramData\Server-Installer\certs\dashboard.crt',
  '--key',
  'C:\ProgramData\Server-Installer\certs\dashboard.key'
)
$proc = Start-Process -FilePath $pythonExe -ArgumentList $dashboardArgs -WorkingDirectory $root -WindowStyle Hidden -PassThru
if (-not $proc) {
  throw 'Dashboard process did not start.'
}
