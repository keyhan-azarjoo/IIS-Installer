# .NET Deployment Manual

This folder contains the Windows and Linux installers for deploying published .NET applications.

Folder layout:

```text
DotNet/
├── linux
└── windows
```

## Included Installers

- `windows/install-windows-dotnet-host.ps1`
- `windows/start-server-dashboard.ps1`
- `linux/install-linux-dotnet-runner.sh`
- `linux/start-server-dashboard.sh`

## Manual Docker API Example

Deploy the .NET API behind Nginx reverse proxy with HTTPS support.

### Directory Structure

```text
C:\WeighingSystem\
 +-- docker-compose.yml
 +-- nginx.conf
 +-- certs/
 |   +-- cert.pem
 |   `-- key.pem
 `-- API/
     +-- Dockerfile
     `-- linux/      (contains Api.dll etc.)
```

### Step 1: Go to WeighingSystem

```powershell
cd C:\WeighingSystem
```

### Step 2: Create `API/Dockerfile`

Create a file named `API/Dockerfile` with no extension:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0

WORKDIR /app
COPY ../API/linux .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Api.dll"]
```

### Step 3: Create `nginx.conf`

```nginx
events {}

http {
    server {
        listen 80;

        location / {
            proxy_pass http://api:8080;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 443 ssl;

        ssl_certificate /etc/nginx/certs/cert.pem;
        ssl_certificate_key /etc/nginx/certs/key.pem;

        location / {
            proxy_pass http://api:8080;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 4: Create `docker-compose.yml`

```yaml
services:
  api:
    build:
      context: ..
      dockerfile: API/Dockerfile
    container_name: API
    environment:
      - ASPNETCORE_URLS=http://+:8080
    expose:
      - "8080"
    restart: always

  nginx:
    image: nginx:latest
    container_name: api-nginx
    ports:
      - "8585:80"
      - "8586:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - api
```

### Step 5: Generate self-signed certificates

```powershell
mkdir certs
docker run --rm -v ${PWD}/certs:/certs alpine sh -c "
apk add --no-cache openssl &&
openssl req -x509 -nodes -days 365 \
-newkey rsa:2048 \
-keyout /certs/key.pem \
-out /certs/cert.pem \
-subj '/CN=192.168.1.182'
"
```

### Step 6: Build & Run

```powershell
docker compose up -d --build
```

### Step 7: Verify

```powershell
docker ps
```

You should see both `API` and `api-nginx` containers running.

### Step 8: Test

HTTP:

```text
http://192.168.1.182:8585/health
```

HTTPS:

```text
https://192.168.1.182:8586/health
```

## Notes

- `404` on `/` is normal. Use `/health` to verify the API is running.
- HTTPS browser warning is expected with self-signed certs. Click `Advanced` > `Proceed`.

## Architecture

```text
Browser -> https://192.168.1.182:8586
        -> Nginx
        -> http://api:8080
        -> .NET API
```
