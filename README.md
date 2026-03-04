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
- Prompts for the .NET release channel and installs the matching .NET SDK, ASP.NET Core Runtime, and Hosting Bundle.
- Prompts for either a Git repository URL or a local project folder path.
- Clones, updates, or copies the app source, publishes the first `.csproj` it finds, and creates an IIS site for it.

Defaults:

- .NET channel prompt accepts `8`, `9`, `10`, `10.0`, `LTS`, `STS`, or a direct value supported by Microsoft `aka.ms` channel links. Default: `8.0`
- IIS site name: `DotNetApp`
- IIS port: `8080`

Example with custom values:

```powershell
.\install-windows-dotnet-host.ps1 -DotNetChannel 10 -SiteName MyApi -SitePort 8090
```

Example with custom installer URLs:

```powershell
.\install-windows-dotnet-host.ps1 -DotNetChannel 9 -SdkInstallerUrl "https://example.com/dotnet-sdk.exe" -AspNetRuntimeUrl "https://example.com/aspnet-runtime.exe" -HostingBundleUrl "https://example.com/dotnet-hosting.exe"
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

- Prompts for the .NET release channel, then installs `curl`, `git`, and the .NET SDK / ASP.NET Core Runtime.
- Prompts for either a Git repository URL or a local project folder path.
- Clones, updates, or copies the app source, publishes the first `.csproj` it finds, and creates a `systemd` service to run it.

Defaults:

- .NET channel prompt accepts `8`, `9`, `10`, `10.0`, `LTS`, `STS`, or another valid `dotnet-install` channel value. Default: `8.0`
- Service name: `dotnet-app`
- App port: `5000`

Example with custom values:

```bash
sudo DOTNET_CHANNEL=10 SERVICE_NAME=my-api SERVICE_PORT=5050 ./install-linux-dotnet-runner.sh
```

Example with a custom install script URL:

```bash
sudo DOTNET_CHANNEL=9 DOTNET_INSTALL_SCRIPT_URL="https://example.com/dotnet-install.sh" ./install-linux-dotnet-runner.sh
```

## Notes

- Both scripts assume the target repository contains a runnable `.NET` project (`.csproj`).
- For local deployment, pass a folder path that already contains the backend project source.
- The Windows flow is intended for ASP.NET Core web apps hosted behind IIS.
- The Linux flow runs the app directly with `systemd` and Kestrel.
- As of March 4, 2026, Microsoft lists `.NET 8`, `.NET 9`, and `.NET 10` as active supported releases in the official support policy (last updated February 10, 2026), so keeping the channel user-selectable is the safest approach. Sources: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core and https://dotnet.microsoft.com/en-us/download
