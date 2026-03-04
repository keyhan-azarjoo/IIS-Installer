# IIS / .NET App Installer

This repository now includes two OS-specific installers under `DotNet`:

- `DotNet/windows/install-windows-dotnet-host.ps1`
- `DotNet/linux/install-linux-dotnet-runner.sh`

## Windows

Fetch and run the PowerShell script from an elevated terminal:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/keyhan-azarjoo/IIS-Installer/main/DotNet/windows/install-windows-dotnet-host.ps1" -OutFile ".\install-windows-dotnet-host.ps1"
.\install-windows-dotnet-host.ps1
```

Repository folder:

```text
https://github.com/keyhan-azarjoo/IIS-Installer/tree/main/DotNet/windows
```

What it does:

- Enables IIS and required modules, including WebSockets.
- Installs the current .NET SDK, ASP.NET Core Runtime, and Hosting Bundle for the selected channel.
- Prompts for a Git repository URL.
- Clones or updates the repo, publishes the first `.csproj` it finds, and creates an IIS site for it.

Defaults:

- .NET channel: `8.0`
- IIS site name: `DotNetApp`
- IIS port: `8080`

Example with custom values:

```powershell
.\install-windows-dotnet-host.ps1 -DotNetChannel 9.0 -SiteName MyApi -SitePort 8090
```

## Linux

Fetch and run the shell script as root:

```bash
curl -fsSL "https://raw.githubusercontent.com/keyhan-azarjoo/IIS-Installer/main/DotNet/linux/install-linux-dotnet-runner.sh" -o ./install-linux-dotnet-runner.sh
chmod +x ./install-linux-dotnet-runner.sh
sudo ./install-linux-dotnet-runner.sh
```

Repository folders:

```text
Windows: https://github.com/keyhan-azarjoo/IIS-Installer/tree/main/DotNet/windows
Linux:   https://github.com/keyhan-azarjoo/IIS-Installer/tree/main/DotNet/linux
```

What it does:

- Installs `curl`, `git`, and the .NET SDK / ASP.NET Core Runtime.
- Prompts for a Git repository URL.
- Clones or updates the repo, publishes the first `.csproj` it finds, and creates a `systemd` service to run it.

Defaults:

- .NET channel: `8.0`
- Service name: `dotnet-app`
- App port: `5000`

Example with custom values:

```bash
sudo DOTNET_CHANNEL=9.0 SERVICE_NAME=my-api SERVICE_PORT=5050 ./install-linux-dotnet-runner.sh
```

## Notes

- Both scripts assume the target repository contains a runnable `.NET` project (`.csproj`).
- The Windows flow is intended for ASP.NET Core web apps hosted behind IIS.
- The Linux flow runs the app directly with `systemd` and Kestrel.
