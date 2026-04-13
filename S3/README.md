# Local S3 Storage (MinIO + Nginx HTTPS)

Automated local S3-compatible storage setup using:
- MinIO (object storage)
- HTTPS reverse proxy
- Windows mode selection:
  - IIS mode (native MinIO + IIS reverse proxy)
  - Docker mode (MinIO + Nginx containers)
- Linux/macOS: native install (no Docker)

This project includes:
- `windows/setup-storage.ps1` for Windows (IIS or Docker)
- `windows/installers/install-iis-prereqs.ps1` for IIS prerequisites
- `linux-macos/setup-storage.sh` for Linux/macOS (native only)

## Features

- HTTPS-enabled local endpoint
- Domain/URL input (for example: `mystorage.local`)
- Optional LAN access for other computers
- Automatic container cleanup prompt for previously created servers
- Port conflict handling (prefers `443`, can fall back to `8443/9443/10443`)
- Self-signed certificate generation and local trust attempt

## Windows Usage

Installer asks:
- `1) IIS`
- `2) Docker`

If you select Docker mode, Docker Desktop must already be installed.

Docker Desktop is a required prerequisite.  
Install it manually first (do not install from terminal commands):

- Official page: `https://www.docker.com/products/docker-desktop/`
- Direct Windows installer: `https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe`

After installing Docker Desktop, open it once and wait for **Engine running**.

Run in **PowerShell as Administrator**:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
```

Then run the installer from this repo:

```powershell
.\windows\setup-storage.ps1
```

Script reference:

`https://github.com/keyhan-azarjoo/S3/blob/main/windows/setup-storage.ps1`

One-line run from GitHub (PowerShell, simpler bootstrap):

```powershell
$script = Join-Path $env:TEMP 'setup-storage.ps1'; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/keyhan-azarjoo/S3/main/windows/setup-storage.ps1' -OutFile $script; & $script
```

## Linux/macOS Usage

```bash
chmod +x linux-macos/setup-storage.sh
sudo ./linux-macos/setup-storage.sh
```
Linux/macOS installer is native (no Docker required).

One-line run from GitHub (Linux/macOS, same command for both):

```bash
script="/tmp/setup-storage.sh"; curl -fsSL "https://raw.githubusercontent.com/keyhan-azarjoo/S3/main/linux-macos/setup-storage.sh" -o "$script" && chmod +x "$script" && sudo "$script"
```

The same command above works on both Linux and macOS.

## Access URLs

After installation, script output shows:
- MinIO Console HTTPS: `https://<domain>` or `https://<domain>:<console-port>`
- S3 API HTTPS: `https://<domain>:<api-port>` (or `https://<domain>` when `443` is used)
- LAN Console URL: `https://<server-lan-ip>` or `https://<server-lan-ip>:<console-port>` (if enabled)
- LAN S3 API URL: `https://<server-lan-ip>:<api-port>` (if enabled)
- MinIO Console direct URL: `http://localhost:<minio-ui-port>`
- MinIO API direct URL: `http://localhost:<minio-api-port>`

Default login:
- Username: `admin`
- Password: `StrongPassword123`

## DNS / Domain Notes

If domain works on server but not on other computers, set DNS properly:
- Add router/internal DNS record: `<domain> -> <server-lan-ip>`
- Or add hosts entry on each client (if you choose per-client setup)

Without DNS mapping, use IP URL directly.

## Manual Docker Setup

Deploy MinIO object storage behind Nginx with HTTP + HTTPS.

### Directory Structure

```text
C:\WeighingSystem\S3\
 +-- docker-compose.yml
 +-- data/
 +-- certs/
 |   +-- public.crt
 |   `-- private.key
 `-- nginx/
     `-- nginx.conf
```

### Step 0: Clean (if re-deploying)

```powershell
cd C:\WeighingSystem\S3
docker compose down
Remove-Item -Recurse -Force data, certs, nginx, docker-compose.yml -ErrorAction Ignore
```

### Step 1: Create structure

```powershell
mkdir data
mkdir certs
mkdir nginx
```

### Step 2: Generate SSL certificates

```powershell
docker run --rm -v ${PWD}/certs:/certs alpine sh -c "
apk add --no-cache openssl &&
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout /certs/private.key \
-out /certs/public.crt \
-subj '/CN=localhost'
"
```

Verify you have `certs/private.key` and `certs/public.crt`.

### Step 3: Create `nginx/nginx.conf`

```nginx
events {}

http {
    server {
        listen 9085;

        # UI
        location / {
            proxy_pass http://minio:9001;
            proxy_set_header Host $host;
        }

        # S3 API
        location /s3/ {
            proxy_pass http://minio:9000/;
            proxy_set_header Host $host;
        }
    }

    server {
        listen 9086 ssl;

        ssl_certificate /etc/nginx/certs/public.crt;
        ssl_certificate_key /etc/nginx/certs/private.key;

        # UI
        location / {
            proxy_pass http://minio:9001;
            proxy_set_header Host $host;
        }

        # S3 API
        location /s3/ {
            proxy_pass http://minio:9000/;
            proxy_set_header Host $host;
        }
    }
}
```

### Step 4: Create `docker-compose.yml`

```yaml
services:
  minio:
    image: minio/minio:RELEASE.2024-01-16T16-07-38Z
    container_name: minio
    restart: unless-stopped

    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: admin123

    command: server /data --console-address ":9001"

    volumes:
      - ./data:/data

    expose:
      - "9000"
      - "9001"

  s3-nginx:
    image: nginx:latest
    container_name: s3-nginx
    restart: unless-stopped

    ports:
      - "9085:9085"
      - "9086:9086"

    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro

    depends_on:
      - minio
```

### Step 5: Run

```powershell
docker compose up -d
```

### Step 6: Access

HTTP:

```text
http://localhost:9085
```

HTTPS:

```text
https://localhost:9086
```

S3 API:

```text
http://localhost:9085/s3/
```

Login: `admin / admin123`

You should see the full MinIO console with sidebar: `Buckets`, `Identity`, `Users`, `Access Keys`, `Policies`.

## Troubleshooting

```powershell
docker logs s3-nginx
docker logs minio
```

## Technical Notes

- MinIO API listens on port `9000`, UI on port `9001`.
- MinIO cannot serve HTTP + HTTPS together natively. Nginx handles both.

## Architecture

```text
Browser -> https://localhost:9086 (or http://localhost:9085)
        -> Nginx (9085/9086)
        -> http://minio:9001 (console UI)
        -> http://minio:9000 (S3 API)
        -> MinIO Storage
```

## Known Notes

- If Docker Compose fails with `invalid proto:`, installer automatically falls back to `docker run`.
- If `443` is busy, installer can clean previous managed containers or use alternate HTTPS port.
