Set-StrictMode -Version Latest

function Ensure-WindowsContainersFeature {
    $feature = Get-WindowsOptionalFeature -Online -FeatureName "Containers" -ErrorAction SilentlyContinue
    if (-not $feature) {
        return
    }

    if ($feature.State -eq "Enabled") {
        Write-Host "Windows Containers feature already enabled."
        return
    }

    Write-Host "Enabling Windows Containers feature"
    Enable-WindowsOptionalFeature -Online -FeatureName "Containers" -All -NoRestart | Out-Null
}

function Install-DockerWithDockerMsftProvider {
    Ensure-WindowsContainersFeature

    if (-not (Get-PackageProvider -Name NuGet -ErrorAction SilentlyContinue)) {
        Write-Host "Installing NuGet package provider"
        Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force | Out-Null
    }

    if (-not (Get-PSRepository -Name "PSGallery" -ErrorAction SilentlyContinue)) {
        throw "PowerShell Gallery repository is unavailable. Cannot install Docker automatically."
    }

    if (-not (Get-PackageProvider -Name DockerMsftProvider -ErrorAction SilentlyContinue)) {
        Write-Host "Installing DockerMsftProvider"
        Install-Module -Name DockerMsftProvider -Repository PSGallery -Force | Out-Null
    }

    Write-Host "Installing Docker via DockerMsftProvider"
    Install-Package -Name docker -ProviderName DockerMsftProvider -Force | Out-Null

    $dockerService = Get-Service -Name docker -ErrorAction SilentlyContinue
    if ($dockerService) {
        if ($dockerService.Status -ne "Running") {
            Start-Service docker
        }
        return
    }

    throw "Docker installation finished, but the docker service was not found."
}

function Ensure-DockerInstalled {
    if (Test-Command -Name "docker") {
        return
    }

    if (Test-Command -Name "winget") {
        Write-Host "Installing Docker Desktop with winget"
        $process = Start-Process -FilePath "winget" -ArgumentList "install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements --silent" -Wait -PassThru -NoNewWindow
        if ($process.ExitCode -ne 0) {
            throw "Docker installation failed with exit code $($process.ExitCode)."
        }
        return
    }

    if (Get-Command Install-Package -ErrorAction SilentlyContinue) {
        Install-DockerWithDockerMsftProvider
        return
    }

    throw "Docker is not installed and no supported automatic installer was found. Install Docker manually or choose IIS mode."
}

function Get-DockerRuntimeTag {
    param([Parameter(Mandatory = $true)][string]$DotNetChannel)

    $majorVersion = Get-DotNetMajorVersion -Channel $DotNetChannel
    return "$majorVersion.0"
}

function Write-Dockerfile {
    param(
        [Parameter(Mandatory = $true)][string]$ContentPath,
        [Parameter(Mandatory = $true)][string]$AssemblyName,
        [Parameter(Mandatory = $true)][string]$DotNetChannel
    )

    $dockerfilePath = Join-Path $ContentPath "Dockerfile.generated"
    $runtimeTag = Get-DockerRuntimeTag -DotNetChannel $DotNetChannel
    $content = @"
FROM mcr.microsoft.com/dotnet/aspnet:$runtimeTag
WORKDIR /app
COPY . .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "$AssemblyName.dll"]
"@
    Set-Content -Path $dockerfilePath -Value $content -Encoding UTF8
    return $dockerfilePath
}

function Invoke-DockerDeployment {
    param(
        [Parameter(Mandatory = $true)][string]$ContentPath,
        [Parameter(Mandatory = $true)][string]$PackageName,
        [Parameter(Mandatory = $true)][string]$SiteName,
        [Parameter(Mandatory = $true)][string]$DotNetChannel,
        [Parameter(Mandatory = $true)][int]$HostPort,
        [string]$DomainName
    )

    Ensure-DockerInstalled

    $deploymentRoot = Join-Path $env:ProgramData "IIS-Installer\docker"
    $targetPath = Join-Path $deploymentRoot $PackageName
    New-Item -ItemType Directory -Path $deploymentRoot -Force | Out-Null
    Copy-FolderContent -SourcePath $ContentPath -TargetPath $targetPath

    $assemblyPath = Find-ApplicationAssembly -DeploymentPath $targetPath
    $assemblyName = [System.IO.Path]::GetFileNameWithoutExtension($assemblyPath)
    $dockerfilePath = Write-Dockerfile -ContentPath (Split-Path -Path $assemblyPath -Parent) -AssemblyName $assemblyName -DotNetChannel $DotNetChannel

    $imageName = ("{0}:latest" -f ($SiteName.ToLowerInvariant() -replace '[^a-z0-9\-]', '-'))
    $containerName = ($SiteName.ToLowerInvariant() -replace '[^a-z0-9\-]', '-')

    & docker rm -f $containerName 2>$null | Out-Null

    & docker build -f $dockerfilePath -t $imageName $targetPath | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "docker build failed."
    }

    & docker run -d --name $containerName -p "${HostPort}:8080" $imageName | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "docker run failed."
    }

    $resolvedHost = Resolve-HostName -DomainName $DomainName
    return @{
        Host = $resolvedHost
        HttpPort = $HostPort
        Path = $targetPath
        Container = $containerName
    }
}
