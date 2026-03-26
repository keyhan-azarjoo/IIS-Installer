(() => {
  const ns = window.ServerInstallerUI = window.ServerInstallerUI || {};
  ns.pages = ns.pages || {};

  // ── Shared API documentation registry ───────────────────────────────────────
  // Each key is a service slug used as setPage("api-docs-<slug>")
  const API_DOCS = {

    // ═══════════════════════════════════════════════════════════════════════════
    // S3 / MinIO
    // ═══════════════════════════════════════════════════════════════════════════
    s3: {
      title: "S3 Storage (MinIO) API",
      color: "#0f766e",
      description: "MinIO provides a full Amazon S3-compatible API. You can use any S3 SDK (AWS SDK, boto3, mc CLI, etc.) to interact with your storage. Below are the key API operations available through the MinIO S3 gateway.",
      baseUrl: "/api/s3",
      sections: [
        {
          name: "Bucket Operations",
          endpoints: [
            { method: "GET", path: "/api/s3/buckets", description: "List all buckets", response: '{ "ok": true, "buckets": [{ "name": "my-bucket", "creation_date": "2024-01-01T00:00:00Z" }] }' },
            { method: "POST", path: "/api/s3/buckets", description: "Create a new bucket", body: '{ "name": "my-bucket" }', response: '{ "ok": true, "message": "Bucket created" }' },
            { method: "DELETE", path: "/api/s3/buckets/{name}", description: "Delete a bucket (must be empty)", response: '{ "ok": true, "message": "Bucket deleted" }' },
          ],
        },
        {
          name: "Object Operations",
          endpoints: [
            { method: "GET", path: "/api/s3/objects?bucket={name}&prefix={prefix}", description: "List objects in a bucket with optional prefix filter", response: '{ "ok": true, "objects": [{ "key": "file.txt", "size": 1024, "last_modified": "..." }] }' },
            { method: "POST", path: "/api/s3/upload", description: "Upload a file to a bucket (multipart form: bucket, key, file)", body: "multipart/form-data: bucket, key (optional), file", response: '{ "ok": true, "key": "uploaded-file.txt", "size": 1024 }' },
            { method: "GET", path: "/api/s3/download?bucket={name}&key={key}", description: "Download an object from a bucket", response: "Binary file content" },
            { method: "DELETE", path: "/api/s3/objects/{bucket}/{key}", description: "Delete an object from a bucket", response: '{ "ok": true, "message": "Object deleted" }' },
            { method: "POST", path: "/api/s3/presign", description: "Generate a pre-signed URL for temporary access", body: '{ "bucket": "my-bucket", "key": "file.txt", "expires": 3600 }', response: '{ "ok": true, "url": "https://...", "expires_in": 3600 }' },
          ],
        },
        {
          name: "Info & Status",
          endpoints: [
            { method: "GET", path: "/api/s3/info", description: "Get S3 service info (endpoint, region, version)", response: '{ "ok": true, "endpoint": "https://...", "region": "us-east-1", "version": "..." }' },
            { method: "GET", path: "/api/s3/health", description: "Health check for S3 service", response: '{ "ok": true, "status": "healthy" }' },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MongoDB
    // ═══════════════════════════════════════════════════════════════════════════
    mongo: {
      title: "MongoDB API",
      color: "#15803d",
      description: "Manage MongoDB databases, collections, and documents through the dashboard API. These endpoints proxy requests to the running MongoDB instance.",
      baseUrl: "/api/mongo",
      sections: [
        {
          name: "Database Operations",
          endpoints: [
            { method: "GET", path: "/api/mongo/databases", description: "List all databases with size info", response: '{ "ok": true, "databases": [{ "name": "mydb", "sizeOnDisk": 8192, "empty": false }] }' },
            { method: "POST", path: "/api/mongo/databases", description: "Create a new database (creates an init collection)", body: '{ "name": "mydb" }', response: '{ "ok": true, "message": "Database created" }' },
            { method: "DELETE", path: "/api/mongo/databases/{name}", description: "Drop a database", response: '{ "ok": true, "message": "Database dropped" }' },
          ],
        },
        {
          name: "Collection Operations",
          endpoints: [
            { method: "GET", path: "/api/mongo/native/collections?db={dbname}", description: "List collections in a database", response: '{ "ok": true, "collections": ["users", "orders"] }' },
            { method: "POST", path: "/api/mongo/collections", description: "Create a new collection", body: '{ "db": "mydb", "name": "users" }', response: '{ "ok": true, "message": "Collection created" }' },
            { method: "DELETE", path: "/api/mongo/collections/{db}/{name}", description: "Drop a collection", response: '{ "ok": true, "message": "Collection dropped" }' },
          ],
        },
        {
          name: "Document Operations",
          endpoints: [
            { method: "GET", path: "/api/mongo/native/documents?db={db}&collection={col}&limit=50&skip=0", description: "Query documents with pagination", response: '{ "ok": true, "documents": [...], "total": 100 }' },
            { method: "POST", path: "/api/mongo/documents", description: "Insert one or more documents", body: '{ "db": "mydb", "collection": "users", "documents": [{ "name": "John" }] }', response: '{ "ok": true, "inserted_count": 1, "inserted_ids": ["..."] }' },
            { method: "PUT", path: "/api/mongo/documents", description: "Update documents matching a filter", body: '{ "db": "mydb", "collection": "users", "filter": { "name": "John" }, "update": { "$set": { "age": 30 } } }', response: '{ "ok": true, "matched_count": 1, "modified_count": 1 }' },
            { method: "DELETE", path: "/api/mongo/documents", description: "Delete documents matching a filter", body: '{ "db": "mydb", "collection": "users", "filter": { "name": "John" } }', response: '{ "ok": true, "deleted_count": 1 }' },
          ],
        },
        {
          name: "Commands & Info",
          endpoints: [
            { method: "POST", path: "/api/mongo/native/command", description: "Run a raw MongoDB command", body: '{ "db": "mydb", "command": { "ping": 1 } }', response: '{ "ok": true, "result": { "ok": 1 } }' },
            { method: "GET", path: "/api/mongo/native/overview", description: "Get server overview (version, uptime, connections)", response: '{ "ok": true, "version": "7.0", "uptime": 86400, ... }' },
            { method: "GET", path: "/api/mongo/health", description: "Health check for MongoDB service", response: '{ "ok": true, "status": "healthy", "connections": 5 }' },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Proxy
    // ═══════════════════════════════════════════════════════════════════════════
    proxy: {
      title: "Proxy / VPN API",
      color: "#1d4ed8",
      description: "Manage the multi-layer proxy stack: users, layers, services, and configuration. The proxy panel runs its own authenticated API server.",
      baseUrl: "/api/proxy",
      sections: [
        {
          name: "User Management",
          endpoints: [
            { method: "GET", path: "/api/proxy/users", description: "List all proxy users with connection status", response: '{ "ok": true, "users": [{ "username": "user1", "connected": true, "traffic": "1.2 GB" }] }' },
            { method: "POST", path: "/api/proxy/users", description: "Add a new proxy user", body: '{ "username": "user1", "password": "pass123" }', response: '{ "ok": true, "message": "User created" }' },
            { method: "PUT", path: "/api/proxy/users/{username}/password", description: "Update user password", body: '{ "password": "newpass" }', response: '{ "ok": true, "message": "Password updated" }' },
            { method: "DELETE", path: "/api/proxy/users/{username}", description: "Remove a proxy user", response: '{ "ok": true, "message": "User deleted" }' },
          ],
        },
        {
          name: "Layer & Service",
          endpoints: [
            { method: "GET", path: "/api/proxy/info", description: "Get proxy system info (layer, service name, OS)", response: '{ "ok": true, "layer": "layer7-v2ray-vless", "service": "xray", "os": "linux" }' },
            { method: "GET", path: "/api/proxy/status", description: "Get all proxy service statuses", response: '{ "ok": true, "services": { "xray": "running", "nginx": "running" } }' },
            { method: "POST", path: "/api/proxy/service/restart", description: "Restart the proxy service", response: '{ "ok": true, "message": "Service restarted" }' },
            { method: "POST", path: "/api/proxy/layer/switch", description: "Switch proxy layer", body: '{ "layer": "layer7-v2ray-vmess" }', response: '{ "ok": true, "message": "Layer switched" }' },
          ],
        },
        {
          name: "Connection & Config",
          endpoints: [
            { method: "GET", path: "/api/proxy/users/{username}/config", description: "Get user connection config (V2Ray URI, QR code, etc.)", response: '{ "ok": true, "config": "vless://...", "qr_code": "data:image/png;..." }' },
            { method: "GET", path: "/api/proxy/health", description: "Health check for proxy service", response: '{ "ok": true, "status": "healthy" }' },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SAM3
    // ═══════════════════════════════════════════════════════════════════════════
    sam3: {
      title: "SAM3 - Segment Anything Model 3 API",
      color: "#7c3aed",
      description: "SAM3 provides AI-powered object detection and segmentation. Upload images or video, run detection with text/point/box prompts, track objects, and export results in multiple formats.",
      baseUrl: "http://{sam3_host}:{sam3_port}",
      sections: [
        {
          name: "Image Detection",
          endpoints: [
            { method: "POST", path: "/detect", description: "Detect objects in an image using text prompts", body: 'multipart/form-data: image (file), prompt (text, e.g. "person, car, dog"), threshold (float, 0.0-1.0)', response: '{ "detections": [{ "label": "person", "confidence": 0.95, "bbox": [x1,y1,x2,y2], "mask": "base64..." }] }' },
            { method: "POST", path: "/detect-point", description: "Detect at specific point coordinates", body: 'multipart/form-data: image, points (JSON array of [x,y]), labels (JSON array of 0/1)', response: '{ "detections": [{ "mask": "base64...", "score": 0.98 }] }' },
            { method: "POST", path: "/detect-box", description: "Detect within bounding box region", body: 'multipart/form-data: image, box (JSON [x1,y1,x2,y2])', response: '{ "detections": [{ "mask": "base64...", "score": 0.97 }] }' },
            { method: "POST", path: "/detect-exemplar", description: "Detect similar objects using a visual example", body: "multipart/form-data: image, exemplar (cropped example image)", response: '{ "detections": [{ "mask": "base64...", "score": 0.92 }] }' },
            { method: "POST", path: "/detect-live", description: "Process a live camera frame for real-time detection", body: 'multipart/form-data: image, prompt, threshold', response: '{ "detections": [...], "processing_time_ms": 45 }' },
          ],
        },
        {
          name: "Video Processing",
          endpoints: [
            { method: "POST", path: "/upload-video", description: "Upload a video file for processing", body: "multipart/form-data: video (file)", response: '{ "video_id": "abc123", "frames": 300, "fps": 30, "duration": 10.0 }' },
            { method: "GET", path: "/process-video/{video_id}?prompt={text}&threshold={float}", description: "Process video with detection (SSE stream)", response: "text/event-stream: frame-by-frame detection results" },
            { method: "GET", path: "/get-video/{video_id}", description: "Download processed video with overlays", response: "video/mp4 binary" },
            { method: "GET", path: "/get-frame/{video_id}/{frame_number}", description: "Get a specific processed frame as image", response: "image/jpeg binary" },
            { method: "GET", path: "/track-object/{video_id}?x={int}&y={int}&frame={int}", description: "Track an object across video frames (SSE stream)", response: "text/event-stream: tracking results per frame" },
          ],
        },
        {
          name: "Export",
          endpoints: [
            { method: "POST", path: "/export/mask", description: "Export detection masks as PNG images", body: '{ "detections": [...] }', response: "image/png binary" },
            { method: "POST", path: "/export/masks-zip", description: "Export all masks as a ZIP archive", body: '{ "detections": [...] }', response: "application/zip binary" },
            { method: "POST", path: "/export/json", description: "Export detections as JSON file", body: '{ "detections": [...] }', response: "application/json file download" },
            { method: "POST", path: "/export/coco", description: "Export in COCO annotation format", body: '{ "detections": [...] }', response: "application/json COCO format" },
          ],
        },
        {
          name: "Model Info",
          endpoints: [
            { method: "GET", path: "/model-info", description: "Get model info (name, device, status)", response: '{ "model": "sam3", "device": "cuda", "loaded": true, "vram_usage": "3.2 GB" }' },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Ollama
    // ═══════════════════════════════════════════════════════════════════════════
    ollama: {
      title: "Ollama LLM API",
      color: "#1e40af",
      description: "Ollama runs large language models locally with an OpenAI-compatible API. Use it for chat, text generation, embeddings, and more. Compatible with any OpenAI SDK client.",
      baseUrl: "http://{ollama_host}:11434",
      sections: [
        {
          name: "Chat & Generate",
          endpoints: [
            { method: "POST", path: "/api/chat", description: "Chat with a model (streaming or non-streaming)", body: '{ "model": "llama3", "messages": [{ "role": "user", "content": "Hello!" }], "stream": true }', response: '{ "model": "llama3", "message": { "role": "assistant", "content": "Hi there!" }, "done": true }' },
            { method: "POST", path: "/api/generate", description: "Generate text completion", body: '{ "model": "llama3", "prompt": "Write a poem about AI", "stream": false }', response: '{ "model": "llama3", "response": "...", "done": true, "total_duration": 1234567890 }' },
            { method: "POST", path: "/api/embeddings", description: "Generate embeddings for text", body: '{ "model": "llama3", "prompt": "Hello world" }', response: '{ "embedding": [0.123, -0.456, ...] }' },
          ],
        },
        {
          name: "Model Management",
          endpoints: [
            { method: "GET", path: "/api/tags", description: "List all downloaded models", response: '{ "models": [{ "name": "llama3:latest", "size": 4700000000, "parameter_size": "8B" }] }' },
            { method: "POST", path: "/api/pull", description: "Download a model from the registry", body: '{ "name": "llama3", "stream": true }', response: '{ "status": "downloading", "completed": 50, "total": 100 }' },
            { method: "DELETE", path: "/api/delete", description: "Delete a downloaded model", body: '{ "name": "llama3" }', response: '{ "status": "success" }' },
            { method: "POST", path: "/api/copy", description: "Copy/alias a model", body: '{ "source": "llama3", "destination": "my-llama" }', response: '{ "status": "success" }' },
            { method: "POST", path: "/api/create", description: "Create a model from a Modelfile", body: '{ "name": "my-model", "modelfile": "FROM llama3\\nSYSTEM You are a helpful assistant." }', response: '{ "status": "success" }' },
          ],
        },
        {
          name: "Model Info",
          endpoints: [
            { method: "POST", path: "/api/show", description: "Show model details (parameters, template, license)", body: '{ "name": "llama3" }', response: '{ "modelfile": "...", "parameters": "...", "template": "..." }' },
            { method: "GET", path: "/api/ps", description: "List currently loaded/running models", response: '{ "models": [{ "name": "llama3", "size": 4700000000, "expires_at": "..." }] }' },
          ],
        },
        {
          name: "OpenAI-Compatible (v1)",
          endpoints: [
            { method: "POST", path: "/v1/chat/completions", description: "OpenAI-compatible chat completions endpoint", body: '{ "model": "llama3", "messages": [{ "role": "user", "content": "Hello" }] }', response: '{ "choices": [{ "message": { "role": "assistant", "content": "Hi!" } }] }' },
            { method: "POST", path: "/v1/completions", description: "OpenAI-compatible text completions", body: '{ "model": "llama3", "prompt": "Once upon a time" }', response: '{ "choices": [{ "text": "..." }] }' },
            { method: "GET", path: "/v1/models", description: "OpenAI-compatible model listing", response: '{ "data": [{ "id": "llama3", "object": "model" }] }' },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // DotNet
    // ═══════════════════════════════════════════════════════════════════════════
    dotnet: {
      title: "DotNet APIs",
      color: "#6d28d9",
      description: "Your deployed .NET Core / ASP.NET APIs. Each deployed API exposes its own endpoints. The dashboard provides management APIs for controlling the deployed services.",
      baseUrl: "/api",
      sections: [
        {
          name: "Service Management",
          endpoints: [
            { method: "GET", path: "/api/system/services?scope=dotnet", description: "List all .NET API services with status", response: '{ "ok": true, "services": [{ "name": "MyApi", "status": "running", "ports": [5000] }] }' },
            { method: "POST", path: "/api/system/service", description: "Control a .NET service (start/stop/restart/delete)", body: '{ "name": "MyApi", "action": "restart", "kind": "iis" }', response: '{ "ok": true, "message": "Service restarted" }' },
          ],
        },
        {
          name: "Deployment",
          endpoints: [
            { method: "POST", path: "/run/windows_iis", description: "Deploy a .NET API to IIS (Windows)", body: "Form fields: PROJECT_PATH, SITE_NAME, HOST_IP, HTTP_PORT, HTTPS_PORT, SSL_CERT_NAME", response: "Streaming HTML output" },
            { method: "POST", path: "/run/windows_docker", description: "Deploy a .NET API as Docker container", body: "Form fields: PROJECT_PATH, CONTAINER_NAME, HOST_IP, HTTP_PORT", response: "Streaming HTML output" },
            { method: "POST", path: "/run/linux", description: "Deploy a .NET API on Linux", body: "Form fields: PROJECT_PATH, SERVICE_NAME, HOST_IP, HTTP_PORT, HTTPS_PORT", response: "Streaming HTML output" },
          ],
        },
        {
          name: "Your API Endpoints",
          endpoints: [
            { method: "GET", path: "http://{host}:{port}/swagger", description: "Open Swagger UI for your deployed API (if enabled)" },
            { method: "GET", path: "http://{host}:{port}/health", description: "Health check endpoint (if configured)" },
            { method: "GET", path: "http://{host}:{port}/api/*", description: "Your custom API endpoints as defined in your .NET project" },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Python APIs
    // ═══════════════════════════════════════════════════════════════════════════
    python: {
      title: "Python APIs",
      color: "#0d9488",
      description: "Deploy and manage Python API services (Flask, FastAPI, Django, etc.). The dashboard manages your Python API deployments and provides gateway endpoints.",
      baseUrl: "/api",
      sections: [
        {
          name: "Service Management",
          endpoints: [
            { method: "GET", path: "/api/system/services?scope=python", description: "List all Python API services", response: '{ "ok": true, "services": [{ "name": "my-flask-app", "status": "running", "ports": [8000] }] }' },
            { method: "POST", path: "/api/system/service", description: "Control a Python service (start/stop/restart/delete)", body: '{ "name": "my-flask-app", "action": "restart", "kind": "systemd" }', response: '{ "ok": true, "message": "Service restarted" }' },
          ],
        },
        {
          name: "Deployment",
          endpoints: [
            { method: "POST", path: "/run/python_api_system", description: "Deploy Python API as OS service", body: "Form fields: PYTHON_API_PROJECT_PATH, PYTHON_API_NAME, PYTHON_API_HOST, PYTHON_API_PORT, PYTHON_API_FRAMEWORK", response: "Streaming HTML output" },
            { method: "POST", path: "/run/python_api_docker", description: "Deploy Python API as Docker container", body: "Form fields: PYTHON_API_PROJECT_PATH, PYTHON_API_NAME, HOST_IP, HTTP_PORT", response: "Streaming HTML output" },
          ],
        },
        {
          name: "Your API Endpoints",
          endpoints: [
            { method: "GET", path: "http://{host}:{port}/docs", description: "FastAPI auto-generated docs (Swagger UI)" },
            { method: "GET", path: "http://{host}:{port}/redoc", description: "FastAPI ReDoc documentation" },
            { method: "GET", path: "http://{host}:{port}/api/*", description: "Your custom API endpoints as defined in your Python project" },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Website
    // ═══════════════════════════════════════════════════════════════════════════
    website: {
      title: "Website Deployment API",
      color: "#b45309",
      description: "Manage static website deployments. Deploy static sites, Flutter web, Next.js exports, and more via Docker, OS service, or IIS.",
      baseUrl: "/api",
      sections: [
        {
          name: "Service Management",
          endpoints: [
            { method: "GET", path: "/api/system/services?scope=website", description: "List all website services", response: '{ "ok": true, "services": [{ "name": "my-site", "status": "running", "ports": [80, 443] }] }' },
            { method: "POST", path: "/api/system/service", description: "Control a website service (start/stop/restart/delete)", body: '{ "name": "my-site", "action": "restart" }', response: '{ "ok": true, "message": "Service restarted" }' },
          ],
        },
        {
          name: "Deployment",
          endpoints: [
            { method: "POST", path: "/run/website_deploy", description: "Deploy a static website", body: "Form fields: WEBSITE_NAME, WEBSITE_SOURCE, HOST_IP, HTTP_PORT, HTTPS_PORT, WEBSITE_ENGINE", response: "Streaming HTML output" },
            { method: "POST", path: "/run/website_iis", description: "Deploy website to IIS (Windows)", body: "Form fields: WEBSITE_NAME, WEBSITE_SOURCE, HOST_IP, HTTP_PORT, HTTPS_PORT", response: "Streaming HTML output" },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Dashboard System
    // ═══════════════════════════════════════════════════════════════════════════
    dashboard: {
      title: "Dashboard System API",
      color: "#475569",
      description: "Core dashboard management APIs for system monitoring, file management, SSL certificates, and service control.",
      baseUrl: "/api",
      sections: [
        {
          name: "System",
          endpoints: [
            { method: "GET", path: "/api/status", description: "Dashboard health check", response: '{ "ok": true }' },
            { method: "GET", path: "/api/system/status?scope=all", description: "Full system metrics (CPU, memory, disk, network)", response: '{ "ok": true, "status": { "cpu_percent": 15, "memory_percent": 42, ... } }' },
            { method: "GET", path: "/api/system/services?scope=all", description: "List all managed services", response: '{ "ok": true, "services": [...] }' },
            { method: "POST", path: "/api/system/service", description: "Control any service (start/stop/restart/delete)", body: '{ "name": "...", "action": "restart", "kind": "..." }', response: '{ "ok": true }' },
            { method: "GET", path: "/api/system/port?port=8080&protocol=tcp", description: "Check if a port is in use", response: '{ "ok": true, "in_use": false }' },
          ],
        },
        {
          name: "File Management",
          endpoints: [
            { method: "GET", path: "/api/files/list?path={dir}", description: "List directory contents", response: '{ "ok": true, "entries": [{ "name": "file.txt", "type": "file", "size": 1024 }] }' },
            { method: "GET", path: "/api/files/read?path={file}", description: "Read file contents", response: '{ "ok": true, "content": "..." }' },
            { method: "POST", path: "/api/files/write", description: "Write file contents", body: '{ "path": "/path/to/file", "content": "..." }', response: '{ "ok": true }' },
            { method: "POST", path: "/api/files/upload", description: "Upload files (multipart)", response: '{ "ok": true, "uploaded": [...] }' },
            { method: "GET", path: "/api/files/download?path={file}", description: "Download a file", response: "Binary file" },
            { method: "POST", path: "/api/files/mkdir", description: "Create directory", body: '{ "path": "/new/dir" }', response: '{ "ok": true }' },
            { method: "POST", path: "/api/files/delete", description: "Delete file or directory", body: '{ "path": "/path/to/delete" }', response: '{ "ok": true }' },
          ],
        },
        {
          name: "SSL Certificates",
          endpoints: [
            { method: "GET", path: "/api/ssl/list", description: "List all certificates", response: '{ "ok": true, "certs": [{ "name": "my-cert", "expires": "2025-01-01" }] }' },
            { method: "POST", path: "/api/ssl/upload", description: "Upload certificate files (multipart)", response: '{ "ok": true }' },
            { method: "POST", path: "/api/ssl/delete", description: "Delete a certificate", body: '{ "name": "my-cert" }', response: '{ "ok": true }' },
          ],
        },
      ],
    },
  };

  // ── Method color helper ─────────────────────────────────────────────────────
  const methodColor = (m) => {
    switch (m) {
      case "GET":    return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
      case "POST":   return { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" };
      case "PUT":    return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
      case "DELETE": return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
      default:       return { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
    }
  };

  // ── Render a single API docs page ───────────────────────────────────────────
  function ApiDocsInner(p) {
    const {
      Box, Button, Card, CardContent, Typography, Stack, Paper, Chip, Alert, Grid, Tooltip,
      setPage, cfg, copyText,
    } = p;

    // Extract the service slug from the page name: "api-docs-s3" → "s3"
    const slug = String(p.page || "").replace(/^api-docs-/, "");
    const doc = API_DOCS[slug];

    if (!doc) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">No API documentation found for "{slug}".</Alert>
          <Button variant="outlined" sx={{ mt: 2, textTransform: "none" }} onClick={() => setPage("home")}>Back to Home</Button>
        </Box>
      );
    }

    const [expandedSections, setExpandedSections] = React.useState(() => {
      const init = {};
      doc.sections.forEach((_, i) => { init[i] = true; });
      return init;
    });

    const toggleSection = (i) => setExpandedSections((prev) => ({ ...prev, [i]: !prev[i] }));

    const copySnippet = (text, label) => {
      if (copyText) copyText(text, label);
      else navigator.clipboard?.writeText(text);
    };

    const curlExample = (ep) => {
      let cmd = `curl -X ${ep.method} "${ep.path}"`;
      if (ep.body && !ep.body.startsWith("multipart") && !ep.body.startsWith("Form")) {
        cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.body}'`;
      }
      return cmd;
    };

    return (
      <Grid container spacing={2}>
        {/* Header */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: `1.5px solid ${doc.color}22` }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <Button variant="text" size="small" onClick={() => window.history.length > 1 ? p.goBack() : setPage("home")} sx={{ textTransform: "none", minWidth: 0, px: 1 }}>
                  &larr; Back
                </Button>
                <Typography variant="h5" fontWeight={900} sx={{ color: doc.color }}>
                  {doc.title}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {doc.description}
              </Typography>
              {doc.baseUrl && (
                <Chip
                  label={`Base URL: ${doc.baseUrl}`}
                  size="small"
                  sx={{ bgcolor: `${doc.color}11`, color: doc.color, border: `1px solid ${doc.color}33`, fontFamily: "monospace", fontWeight: 600 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sections */}
        {doc.sections.map((section, si) => (
          <Grid item xs={12} key={si}>
            <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6" }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Stack
                  direction="row" alignItems="center" spacing={1}
                  sx={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSection(si)}
                >
                  <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1, color: doc.color }}>
                    {section.name}
                  </Typography>
                  <Chip label={`${section.endpoints.length} endpoint${section.endpoints.length > 1 ? "s" : ""}`} size="small" variant="outlined" />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {expandedSections[si] ? "▾" : "▸"}
                  </Typography>
                </Stack>

                {expandedSections[si] && (
                  <Box sx={{ mt: 1.5 }}>
                    {section.endpoints.map((ep, ei) => {
                      const mc = methodColor(ep.method);
                      return (
                        <Paper key={ei} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, borderColor: "#e2e8f0" }}>
                          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
                            <Chip
                              label={ep.method}
                              size="small"
                              sx={{ bgcolor: mc.bg, color: mc.color, border: `1px solid ${mc.border}`, fontWeight: 800, fontFamily: "monospace", minWidth: 70, justifyContent: "center" }}
                            />
                            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, wordBreak: "break-all", flexGrow: 1 }}>
                              {ep.path}
                            </Typography>
                            <Tooltip title="Copy cURL">
                              <Button size="small" variant="text" sx={{ textTransform: "none", minWidth: 0, px: 1, fontSize: 12 }} onClick={() => copySnippet(curlExample(ep), "cURL command")}>
                                cURL
                              </Button>
                            </Tooltip>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {ep.description}
                          </Typography>
                          {ep.body && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" fontWeight={700} sx={{ color: "#64748b" }}>Request Body:</Typography>
                              <Paper elevation={0} sx={{ mt: 0.3, p: 1, bgcolor: "#f8fafc", borderRadius: 1, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", border: "1px solid #e2e8f0" }}>
                                {ep.body}
                              </Paper>
                            </Box>
                          )}
                          {ep.response && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" fontWeight={700} sx={{ color: "#64748b" }}>Response:</Typography>
                              <Paper elevation={0} sx={{ mt: 0.3, p: 1, bgcolor: "#f0fdf4", borderRadius: 1, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", border: "1px solid #dcfce7" }}>
                                {ep.response}
                              </Paper>
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  // Register a page for each service
  Object.keys(API_DOCS).forEach((slug) => {
    ns.pages[`api-docs-${slug}`] = function(p) {
      return React.createElement(ApiDocsInner, { ...p, page: `api-docs-${slug}` });
    };
  });
})();
