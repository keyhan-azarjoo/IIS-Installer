# IIS / .NET App Installer

This repository includes two OS-specific installers under `DotNet`:

- `DotNet/windows/install-windows-dotnet-host.ps1`
- `DotNet/linux/install-linux-dotnet-runner.sh`

These installers no longer clone application source from Git. They deploy only from prebuilt published output.

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
- Prompts for a published build artifact URL, a local published folder, or a local published `.zip`.
- Downloads or copies the published build and creates an IIS site for it.
- Skips IIS features and .NET installers that are already present.

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

- Prompts for the .NET release channel, then installs `curl`, `unzip`, `tar`, and the .NET SDK / ASP.NET Core Runtime.
- Prompts for a published build artifact URL, a local published folder, or a local published `.zip` / `.tar.gz`.
- Downloads or copies the published build and creates a `systemd` service to run it.
- Skips Linux packages and .NET installers that are already present.

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

## Build The App First

Build the app on your build machine or CI machine, package the published output, then give the installer the artifact URL or local package path.

Example publish commands:

```bash
dotnet publish -c Release -r win-x64 --self-contained false -o ./publish/win-x64
dotnet publish -c Release -r linux-x64 --self-contained false -o ./publish/linux-x64
dotnet publish -c Release -r osx-x64 --self-contained false -o ./publish/osx-x64
dotnet publish -c Release -r osx-arm64 --self-contained false -o ./publish/osx-arm64
```

Then package the published output:

```bash
cd ./publish
zip -r win-x64.zip ./win-x64
tar -czf linux-x64.tar.gz ./linux-x64
tar -czf osx-arm64.tar.gz ./osx-arm64
```

If the artifact is private on GitHub, the installers will prompt for a GitHub token so they can download the package.

## Notes

- Both scripts assume the deployment package already contains a runnable published `.NET` app.
- For local deployment, pass a folder path that already contains the published output, not raw source code.
- The Windows flow is intended for ASP.NET Core web apps hosted behind IIS.
- The Linux flow runs the app directly with `systemd` and Kestrel.
- As of March 4, 2026, Microsoft lists `.NET 8`, `.NET 9`, and `.NET 10` as active supported releases in the official support policy (last updated February 10, 2026), so keeping the channel user-selectable is the safest approach. Sources: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core and https://dotnet.microsoft.com/en-us/download
