# MongoDB Deployment Manual

This folder contains the Windows and Linux/macOS installers for MongoDB setup.

Folder layout:

```text
Mongo/
├── linux-macos
└── windows
```

## Included Installers

- `windows/setup-mongodb.ps1`
- `linux-macos/setup-mongodb.sh`

## Manual Docker Setup

Deploy MongoDB with Mongo Express UI behind Nginx with HTTP + HTTPS.

### Directory Structure

```text
C:\WeighingSystem\MongoDb\
 +-- docker-compose.yml
 +-- data/
 +-- certs/
 |   +-- public.crt
 |   `-- private.key
 `-- nginx/
     `-- nginx.conf
```

### Step 0: Clean start

```powershell
mkdir C:\WeighingSystem\MongoDb -Force
cd C:\WeighingSystem\MongoDb

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

### Step 3: Create `nginx/nginx.conf`

```nginx
events {}

http {
    server {
        listen 8721;

        location / {
            proxy_pass http://mongo-express:8081;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    server {
        listen 8722 ssl;

        ssl_certificate /etc/nginx/certs/public.crt;
        ssl_certificate_key /etc/nginx/certs/private.key;

        location / {
            proxy_pass http://mongo-express:8081;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### Step 4: Create `docker-compose.yml`

```yaml
services:
  mongo:
    image: mongo:7
    container_name: mongo-db
    restart: unless-stopped

    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123

    volumes:
      - ./data:/data/db

    ports:
      - "27017:27017"

  mongo-express:
    image: mongo-express:latest
    container_name: mongo-ui
    restart: unless-stopped

    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: admin123
      ME_CONFIG_MONGODB_SERVER: mongo

    depends_on:
      - mongo

  mongo-nginx:
    image: nginx:latest
    container_name: mongo-nginx
    restart: unless-stopped

    ports:
      - "8721:8721"
      - "8722:8722"

    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro

    depends_on:
      - mongo-express
```

### Step 5: Run

```powershell
docker compose up -d
```

### Step 6: Access

UI HTTP:

```text
http://localhost:8721
```

UI HTTPS:

```text
https://localhost:8722
```

Login: `admin / admin123`

### Connection String (for code)

```text
mongodb://admin:admin123@localhost:27017
```

## Troubleshooting

```powershell
docker logs mongo-db
docker logs mongo-ui
docker logs mongo-nginx
```

## Architecture

```text
Browser -> https://localhost:8722 (or http://localhost:8721)
        -> Nginx (8721/8722)
        -> http://mongo-express:8081 (Mongo Express UI)

Code -> mongodb://admin:admin123@localhost:27017
        -> MongoDB (port 27017)
```
