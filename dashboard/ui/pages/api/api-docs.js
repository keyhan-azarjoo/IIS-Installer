(() => {
  const ns = window.ServerInstallerUI = window.ServerInstallerUI || {};

  // ── Method badge colors ──────────────────────────────────────────────────
  const MC = {
    GET:    { bg: "#dcfce7", color: "#166534", border: "#86efac" },
    POST:   { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
    PUT:    { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    DELETE: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  };
  const mcGet = function(m) { return MC[m] || { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" }; };

  /**
   * Render inline API documentation section as a React component.
   * Uses React.createElement (no JSX) to avoid Babel dependency issues.
   *
   * Usage from any page (inside JSX):
   *   {ns.renderApiDocs && ns.renderApiDocs(p, ns.apiDocs.sam3)}
   */
  ns.renderApiDocs = function(p, docData) {
    if (!docData || !docData.sections || !docData.sections.length) return null;
    // Wrap in a component so hooks work
    return React.createElement(function ApiDocsComponent() {
      var Grid = p.Grid, Card = p.Card, CardContent = p.CardContent;
      var Typography = p.Typography, Stack = p.Stack, Button = p.Button;
      var Box = p.Box, Paper = p.Paper, Chip = p.Chip, Tooltip = p.Tooltip;
      var copyText = p.copyText;

      var _s = React.useState(false);
      var open = _s[0], setOpen = _s[1];

      var _e = React.useState(function() {
        var init = {};
        docData.sections.forEach(function(_, i) { init[i] = true; });
        return init;
      });
      var expanded = _e[0], setExpanded = _e[1];

      var toggle = function(i) { setExpanded(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[i] = !prev[i]; return n; }); };

      var doCopy = function(text) {
        if (copyText) copyText(text, "cURL command");
        else if (navigator.clipboard) navigator.clipboard.writeText(text);
      };

      var makeCurl = function(ep) {
        var fp = ep.path;
        if (docData.baseUrl && fp.charAt(0) === "/") fp = docData.baseUrl + fp;
        var c = "curl -X " + ep.method + " \"" + fp + "\"";
        if (ep.body && ep.body.indexOf("multipart") !== 0 && ep.body.indexOf("Form") !== 0) {
          c += " \\\n  -H \"Content-Type: application/json\" \\\n  -d '" + ep.body + "'";
        }
        return c;
      };

      var fullPath = function(ep) {
        if (ep.path.indexOf("http") === 0) return ep.path;
        if (docData.baseUrl) return docData.baseUrl + ep.path;
        return ep.path;
      };

      var tc = docData.color || "#6d28d9";
      var totalEp = 0;
      docData.sections.forEach(function(s) { totalEp += s.endpoints.length; });
      var canOpenManual = !!(docData.manualPageId && p.setPage);

      if (!open) {
        return (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, border: "1.5px solid " + tc + "44", background: "linear-gradient(135deg, " + tc + "05 0%, #ffffff 100%)" }}>
              <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 6, height: 36, borderRadius: 3, bgcolor: tc }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: tc }}>
                      {docData.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {totalEp} API endpoints available — click to view full documentation
                    </Typography>
                  </Box>
                  <Chip label={totalEp + " endpoints"} size="small" sx={{ bgcolor: tc + "15", color: tc, fontWeight: 700, border: "1px solid " + tc + "33" }} />
                  {canOpenManual && (
                    <Button
                      variant="outlined" size="small"
                      onClick={function() { p.setPage(docData.manualPageId); }}
                      sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700, borderColor: tc, color: tc, px: 2.5 }}
                    >
                      Manual Install
                    </Button>
                  )}
                  <Button
                    variant="contained" size="small"
                    onClick={function() { setOpen(true); }}
                    sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700, bgcolor: tc, "&:hover": { bgcolor: tc, filter: "brightness(0.9)" }, px: 3 }}
                  >
                    Show API Documents
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      }

      return (
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: "1.5px solid " + tc + "44" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Box sx={{ width: 6, height: 32, borderRadius: 3, bgcolor: tc }} />
                <Typography variant="h6" fontWeight={900} sx={{ color: tc, flexGrow: 1 }}>
                  {docData.title}
                </Typography>
                {docData.baseUrl && (
                  <Chip
                    label={"Base URL: " + docData.baseUrl}
                    size="small"
                    sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: 11, bgcolor: tc + "11", color: tc, border: "1px solid " + tc + "33" }}
                  />
                )}
                <Button
                  variant="outlined" size="small"
                  onClick={function() { setOpen(false); }}
                  sx={{ textTransform: "none", fontWeight: 700, borderColor: "#cbd5e1", color: "#64748b" }}
                >
                  Hide
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                {docData.description}
              </Typography>

              {docData.sections.map(function(section, si) {
                var isExpanded = expanded[si];
                return (
                  <Box key={si} sx={{ mb: 2.5 }}>
                    <Stack
                      direction="row" alignItems="center" spacing={1}
                      sx={{ cursor: "pointer", userSelect: "none", mb: 1, py: 0.5, px: 1, borderRadius: 1.5, bgcolor: tc + "08", "&:hover": { bgcolor: tc + "12" } }}
                      onClick={function() { toggle(si); }}
                    >
                      <Typography variant="subtitle1" fontWeight={800} sx={{ color: tc, flexGrow: 1 }}>
                        {section.name}
                      </Typography>
                      <Chip label={section.endpoints.length + " endpoint" + (section.endpoints.length > 1 ? "s" : "")} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      <Typography sx={{ color: tc, fontSize: 14, fontWeight: 700 }}>
                        {isExpanded ? "\u25BC" : "\u25B6"}
                      </Typography>
                    </Stack>

                    {isExpanded && section.endpoints.map(function(ep, ei) {
                      var m = mcGet(ep.method);
                      var fp = fullPath(ep);
                      return (
                        <Paper key={ei} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, borderColor: "#e2e8f0", "&:hover": { borderColor: tc + "44" } }}>
                          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
                            <Chip
                              label={ep.method}
                              size="small"
                              sx={{ bgcolor: m.bg, color: m.color, border: "1px solid " + m.border, fontWeight: 800, fontFamily: "monospace", minWidth: 70, justifyContent: "center" }}
                            />
                            <Typography variant="body2" sx={{ fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontWeight: 600, wordBreak: "break-all", flexGrow: 1, fontSize: 13 }}>
                              {fp}
                            </Typography>
                            <Tooltip title="Copy cURL command">
                              <Button size="small" variant="outlined" sx={{ textTransform: "none", minWidth: 0, px: 1.5, fontSize: 11, borderColor: "#e2e8f0" }} onClick={function() { doCopy(makeCurl(ep)); }}>
                                cURL
                              </Button>
                            </Tooltip>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                            {ep.description}
                          </Typography>
                          {ep.body && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" fontWeight={700} sx={{ color: "#475569" }}>Request Body:</Typography>
                              <Paper elevation={0} sx={{ mt: 0.3, p: 1, bgcolor: "#f8fafc", borderRadius: 1.5, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", border: "1px solid #e2e8f0", lineHeight: 1.6 }}>
                                {ep.body}
                              </Paper>
                            </Box>
                          )}
                          {ep.response && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" fontWeight={700} sx={{ color: "#475569" }}>Response:</Typography>
                              <Paper elevation={0} sx={{ mt: 0.3, p: 1, bgcolor: "#f0fdf4", borderRadius: 1.5, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", border: "1px solid #dcfce7", lineHeight: 1.6 }}>
                                {ep.response}
                              </Paper>
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>
      );
    });
  };

  ns.renderManualInstallPage = function(p, manualData) {
    if (!manualData || !manualData.steps || !manualData.steps.length) return null;
    var Grid = p.Grid, Card = p.Card, CardContent = p.CardContent;
    var Typography = p.Typography, Stack = p.Stack, Button = p.Button;
    var Box = p.Box, Paper = p.Paper, Chip = p.Chip, Alert = p.Alert;
    var setPage = p.setPage, copyText = p.copyText;
    var color = manualData.color || "#6d28d9";

    var renderCodeBlock = function(code) {
      return (
        <Paper elevation={0} sx={{ bgcolor: "#0f172a", borderRadius: 2, p: 2, mt: 0.5, position: "relative", overflow: "auto" }}>
          <Button
            size="small"
            onClick={function() { if (copyText) copyText(code, "Code"); }}
            sx={{ position: "absolute", top: 8, right: 8, minWidth: 0, px: 1.5, py: 0.3, color: "#94a3b8", bgcolor: "#1e293b", textTransform: "none", fontSize: 11, "&:hover": { bgcolor: "#334155" } }}
          >
            Copy
          </Button>
          <pre style={{ margin: 0, color: "#e2e8f0", fontSize: 12, lineHeight: 1.7, fontFamily: "'Fira Code',monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{code}</pre>
        </Paper>
      );
    };

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: "1.5px solid " + color + "33" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                {manualData.backPageId && (
                  <Button variant="outlined" size="small" onClick={function() { if (setPage) setPage(manualData.backPageId); }} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700, borderColor: color, color: color }}>
                    Back to {manualData.backLabel || manualData.title}
                  </Button>
                )}
                <Typography variant="h5" fontWeight={900} sx={{ color: color, flexGrow: 1 }}>{manualData.title}</Typography>
                {manualData.chip && <Chip label={manualData.chip} size="small" sx={{ bgcolor: color + "10", color: color, fontWeight: 700 }} />}
              </Stack>
              {manualData.description && (
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {manualData.description}
                </Typography>
              )}
              {manualData.warning && (
                <Alert severity={manualData.warningSeverity || "info"} sx={{ mt: 1.5, borderRadius: 2 }}>
                  {manualData.warning}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6" }}>
            <CardContent>
              {manualData.steps.map(function(step, index) {
                return (
                  <Box key={step.title || index} sx={{ mb: index === manualData.steps.length - 1 ? 0 : 2 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5, color: "#1e293b" }}>{step.title}</Typography>
                    {step.note && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{step.note}</Typography>}
                    {step.code && renderCodeBlock(step.code)}
                  </Box>
                );
              })}
              {manualData.footer && (
                <Alert severity={manualData.footerSeverity || "info"} sx={{ mt: 2, borderRadius: 2 }}>
                  {manualData.footer}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // ── Per-service API documentation data ──────────────────────────────────────
  ns.apiDocs = {
    s3: {
      title: "S3 Storage (MinIO) API",
      manualPageId: "s3-manual",
      color: "#0f766e",
      description: "MinIO S3-compatible API. Use any S3 SDK (AWS SDK, boto3, mc CLI) or these dashboard gateway endpoints. Replace {dashboard-ip}:{dashboard-port} with your dashboard address.",
      baseUrl: "http://{dashboard-ip}:{dashboard-port}",
      sections: [
        { name: "Bucket Operations", endpoints: [
          { method: "GET", path: "/api/s3/buckets", description: "List all buckets.", response: '{ "ok": true, "buckets": [{ "name": "my-bucket", "creation_date": "..." }] }' },
          { method: "POST", path: "/api/s3/buckets", description: "Create a new bucket.", body: '{ "name": "my-bucket" }', response: '{ "ok": true, "message": "Bucket created" }' },
          { method: "DELETE", path: "/api/s3/buckets/{name}", description: "Delete a bucket (must be empty).", response: '{ "ok": true, "message": "Bucket deleted" }' },
        ]},
        { name: "Object Operations", endpoints: [
          { method: "GET", path: "/api/s3/objects?bucket={name}&prefix={prefix}", description: "List objects in a bucket with optional prefix filter.", response: '{ "ok": true, "objects": [{ "key": "file.txt", "size": 1024, "last_modified": "..." }] }' },
          { method: "POST", path: "/api/s3/upload", description: "Upload a file to a bucket. Send as multipart/form-data with fields: bucket, key, file.", body: "multipart/form-data: bucket, key, file", response: '{ "ok": true, "key": "file.txt", "size": 1024 }' },
          { method: "GET", path: "/api/s3/download?bucket={name}&key={key}", description: "Download an object from a bucket.", response: "Binary file content" },
          { method: "DELETE", path: "/api/s3/objects/{bucket}/{key}", description: "Delete an object from a bucket.", response: '{ "ok": true, "message": "Object deleted" }' },
          { method: "POST", path: "/api/s3/presign", description: "Generate a pre-signed URL for temporary access to an object.", body: '{ "bucket": "my-bucket", "key": "file.txt", "expires": 3600 }', response: '{ "ok": true, "url": "https://...", "expires_in": 3600 }' },
        ]},
        { name: "Info & Health", endpoints: [
          { method: "GET", path: "/api/s3/info", description: "Get S3 service connection info (endpoint, access key, region).", response: '{ "ok": true, "endpoint": "http://...", "access_key": "admin", "region": "us-east-1" }' },
          { method: "GET", path: "/api/s3/health", description: "Health check for S3 service.", response: '{ "ok": true, "status": "healthy" }' },
        ]},
      ],
    },

    mongo: {
      title: "MongoDB API",
      manualPageId: "mongo-manual",
      color: "#15803d",
      description: "Manage MongoDB databases, collections, and documents. Replace {dashboard-ip}:{dashboard-port} with your dashboard address.",
      baseUrl: "http://{dashboard-ip}:{dashboard-port}",
      sections: [
        { name: "Database Operations", endpoints: [
          { method: "GET", path: "/api/mongo/databases", description: "List all databases with size information.", response: '{ "ok": true, "databases": [{ "name": "mydb", "sizeOnDisk": 8192 }] }' },
          { method: "POST", path: "/api/mongo/databases", description: "Create a new database.", body: '{ "name": "mydb" }', response: '{ "ok": true, "message": "Database created" }' },
          { method: "DELETE", path: "/api/mongo/databases/{name}", description: "Drop an entire database.", response: '{ "ok": true, "message": "Database dropped" }' },
        ]},
        { name: "Collection Operations", endpoints: [
          { method: "GET", path: "/api/mongo/native/collections?db={dbname}", description: "List all collections in a database.", response: '{ "ok": true, "collections": [{ "name": "users", "type": "collection" }] }' },
          { method: "POST", path: "/api/mongo/collections", description: "Create a new collection.", body: '{ "db": "mydb", "name": "users" }', response: '{ "ok": true, "message": "Collection created" }' },
          { method: "DELETE", path: "/api/mongo/collections/{db}/{name}", description: "Drop a collection.", response: '{ "ok": true }' },
        ]},
        { name: "Document Operations", endpoints: [
          { method: "GET", path: "/api/mongo/native/documents?db={db}&collection={col}&limit=50", description: "Query documents with pagination.", response: '{ "ok": true, "documents": [...], "total": 100 }' },
          { method: "POST", path: "/api/mongo/documents", description: "Insert one or more documents.", body: '{ "db": "mydb", "collection": "users", "documents": [{ "name": "John", "age": 30 }] }', response: '{ "ok": true, "inserted_count": 1 }' },
          { method: "PUT", path: "/api/mongo/documents", description: "Update documents matching a filter.", body: '{ "db": "mydb", "collection": "users", "filter": { "name": "John" }, "update": { "$set": { "age": 31 } } }', response: '{ "ok": true, "modified_count": 1 }' },
          { method: "DELETE", path: "/api/mongo/documents", description: "Delete documents matching a filter.", body: '{ "db": "mydb", "collection": "users", "filter": { "name": "John" } }', response: '{ "ok": true, "deleted_count": 1 }' },
        ]},
        { name: "Commands & Health", endpoints: [
          { method: "POST", path: "/api/mongo/native/command", description: "Run a raw MongoDB command.", body: '{ "db": "mydb", "script": "db.users.count()" }', response: '{ "ok": true, "result": 42 }' },
          { method: "GET", path: "/api/mongo/native/overview", description: "Get server overview (version, databases list).", response: '{ "ok": true, "version": "7.0", "databases": [...] }' },
          { method: "GET", path: "/api/mongo/health", description: "Health check for MongoDB.", response: '{ "ok": true, "status": "healthy", "connections": 5 }' },
        ]},
      ],
    },

    proxy: {
      title: "Proxy / VPN API",
      manualPageId: "proxy-manual",
      color: "#1d4ed8",
      description: "Manage multi-layer proxy/VPN stack. Replace {dashboard-ip}:{dashboard-port} with your dashboard address.",
      baseUrl: "http://{dashboard-ip}:{dashboard-port}",
      sections: [
        { name: "User Management", endpoints: [
          { method: "GET", path: "/api/proxy/users", description: "List all proxy users with connection status.", response: '{ "ok": true, "users": [{ "username": "user1", "connected": true }] }' },
          { method: "POST", path: "/api/proxy/users", description: "Add a new proxy user.", body: '{ "username": "user1", "password": "pass123" }', response: '{ "ok": true, "message": "User created" }' },
          { method: "PUT", path: "/api/proxy/users/{username}/password", description: "Update a user's password.", body: '{ "password": "newpass" }', response: '{ "ok": true }' },
          { method: "DELETE", path: "/api/proxy/users/{username}", description: "Remove a proxy user.", response: '{ "ok": true }' },
        ]},
        { name: "Layer & Service Control", endpoints: [
          { method: "GET", path: "/api/proxy/info", description: "Get proxy system info (current layer, service name, OS).", response: '{ "ok": true, "layer": "layer7-v2ray-vless", "service": "xray" }' },
          { method: "GET", path: "/api/proxy/status", description: "Get all proxy-related service statuses.", response: '{ "ok": true, "services": { "xray": "running", "nginx": "running" } }' },
          { method: "POST", path: "/api/proxy/service/restart", description: "Restart the proxy service.", response: '{ "ok": true }' },
          { method: "POST", path: "/api/proxy/layer/switch", description: "Switch to a different proxy layer.", body: '{ "layer": "layer7-v2ray-vmess" }', response: '{ "ok": true }' },
        ]},
        { name: "Connection Config & Health", endpoints: [
          { method: "GET", path: "/api/proxy/users/{username}/config", description: "Get user connection config (V2Ray URI, QR code data).", response: '{ "ok": true, "config": "vless://..." }' },
          { method: "GET", path: "/api/proxy/health", description: "Health check for proxy panel.", response: '{ "ok": true, "status": "healthy" }' },
        ]},
      ],
    },

    sam3: {
      title: "SAM3 \u2014 Segment Anything Model 3 API",
      color: "#7c3aed",
      description: "AI object detection & segmentation API. All endpoints run on the SAM3 service. Replace {host}:{port} with your SAM3 server address (e.g. 192.168.1.100:5000).",
      baseUrl: "http://{host}:{port}",
      sections: [
        { name: "Image Detection", endpoints: [
          { method: "POST", path: "/detect", description: "Detect objects in an image using text prompts. Upload an image and specify what to find.", body: 'multipart/form-data: image (file), prompt (text, e.g. "person,car,dog"), threshold (float 0.0-1.0, default 0.3)', response: '{ "detections": [{ "label": "person", "confidence": 0.95, "bbox": [x1, y1, x2, y2], "mask": "base64..." }] }' },
          { method: "POST", path: "/detect-point", description: "Segment the object at specific pixel coordinates. Use labels: 1=foreground, 0=background.", body: 'multipart/form-data: image (file), points (JSON e.g. [[250, 300]]), labels (JSON e.g. [1])', response: '{ "detections": [{ "mask": "base64...", "score": 0.98 }] }' },
          { method: "POST", path: "/detect-box", description: "Segment the object within a bounding box region.", body: 'multipart/form-data: image (file), box (JSON [x1, y1, x2, y2])', response: '{ "detections": [{ "mask": "base64...", "score": 0.97 }] }' },
          { method: "POST", path: "/detect-exemplar", description: "Find similar objects using a visual example (cropped reference image).", body: "multipart/form-data: image (file), exemplar (cropped example image file)", response: '{ "detections": [{ "mask": "base64...", "score": 0.92 }] }' },
          { method: "POST", path: "/detect-live", description: "Real-time detection for live camera frames. Optimized for low latency.", body: 'multipart/form-data: image (file), prompt (text), threshold (float)', response: '{ "detections": [...], "processing_time_ms": 45 }' },
        ]},
        { name: "Video Processing", endpoints: [
          { method: "POST", path: "/upload-video", description: "Upload a video file (MP4, AVI, MOV) for AI processing.", body: "multipart/form-data: video (file)", response: '{ "video_id": "abc123", "frames": 300, "fps": 30, "duration": 10.0 }' },
          { method: "GET", path: "/process-video/{video_id}?prompt={text}&threshold={float}", description: "Process video with object detection. Returns SSE stream with per-frame results.", response: "text/event-stream: data: {frame, detections} per frame" },
          { method: "GET", path: "/get-video/{video_id}", description: "Download the processed video with detection overlays.", response: "video/mp4 binary file" },
          { method: "GET", path: "/get-frame/{video_id}/{frame_number}", description: "Get a specific processed frame as JPEG.", response: "image/jpeg binary" },
          { method: "GET", path: "/track-object/{video_id}?x={int}&y={int}&frame={int}", description: "Track a selected object across all video frames. Returns SSE stream.", response: "text/event-stream: data: {frame, bbox, mask} per frame" },
        ]},
        { name: "Export Results", endpoints: [
          { method: "POST", path: "/export/mask", description: "Export a single detection mask as PNG image.", body: "POST body with detection data from /detect", response: "image/png binary" },
          { method: "POST", path: "/export/masks-zip", description: "Export all detection masks as ZIP archive.", body: "POST body with detections array", response: "application/zip binary" },
          { method: "POST", path: "/export/json", description: "Export all detections as downloadable JSON file.", body: "POST body with detections array", response: "application/json download" },
          { method: "POST", path: "/export/coco", description: "Export in COCO annotation format (for ML training datasets).", body: "POST body with detections array", response: "application/json (COCO format)" },
        ]},
        { name: "Model & System Info", endpoints: [
          { method: "GET", path: "/model-info", description: "Get SAM3 model status: model name, device (cpu/cuda/mps), loaded state, VRAM usage.", response: '{ "model": "sam3", "device": "cuda", "loaded": true, "vram_usage": "3.2 GB" }' },
          { method: "GET", path: "/", description: "Open SAM3 web dashboard in browser for visual detection interface.", response: "HTML page (SAM3 Dashboard)" },
        ]},
      ],
    },

    ollama: {
      title: "Ollama LLM API",
      color: "#1e40af",
      description: "Run large language models locally with OpenAI-compatible API. Replace {host}:{port} with your Ollama server address (default port 11434).",
      baseUrl: "http://{host}:11434",
      sections: [
        { name: "Chat & Generate", endpoints: [
          { method: "POST", path: "/api/chat", description: "Chat with a model. Send conversation messages and get the assistant's response.", body: '{ "model": "llama3", "messages": [{ "role": "user", "content": "Hello!" }], "stream": false }', response: '{ "model": "llama3", "message": { "role": "assistant", "content": "Hi!" }, "done": true }' },
          { method: "POST", path: "/api/generate", description: "Generate text completion from a prompt.", body: '{ "model": "llama3", "prompt": "Write a poem about AI", "stream": false }', response: '{ "model": "llama3", "response": "...", "done": true }' },
          { method: "POST", path: "/api/embeddings", description: "Generate vector embeddings for text (useful for RAG and semantic search).", body: '{ "model": "llama3", "prompt": "Hello world" }', response: '{ "embedding": [0.123, -0.456, ...] }' },
        ]},
        { name: "Model Management", endpoints: [
          { method: "GET", path: "/api/tags", description: "List all downloaded models with size and parameter info.", response: '{ "models": [{ "name": "llama3:latest", "size": 4700000000, "parameter_size": "8B" }] }' },
          { method: "POST", path: "/api/pull", description: "Download a model from the Ollama registry.", body: '{ "name": "llama3", "stream": false }', response: '{ "status": "success" }' },
          { method: "DELETE", path: "/api/delete", description: "Delete a downloaded model to free disk space.", body: '{ "name": "llama3" }', response: '{ "status": "success" }' },
          { method: "POST", path: "/api/show", description: "Show model details (parameters, template, license).", body: '{ "name": "llama3" }', response: '{ "modelfile": "...", "parameters": "...", "template": "..." }' },
          { method: "GET", path: "/api/ps", description: "List models currently loaded in memory.", response: '{ "models": [{ "name": "llama3", "size": 4700000000 }] }' },
          { method: "POST", path: "/api/copy", description: "Copy/alias a model under a new name.", body: '{ "source": "llama3", "destination": "my-llama" }', response: "200 OK" },
          { method: "POST", path: "/api/create", description: "Create a custom model from a Modelfile.", body: '{ "name": "my-model", "modelfile": "FROM llama3\\nSYSTEM You are helpful." }', response: '{ "status": "success" }' },
        ]},
        { name: "OpenAI-Compatible (v1)", endpoints: [
          { method: "POST", path: "/v1/chat/completions", description: "OpenAI-compatible chat completions. Works with any OpenAI SDK client.", body: '{ "model": "llama3", "messages": [{ "role": "user", "content": "Hello" }] }', response: '{ "choices": [{ "message": { "role": "assistant", "content": "Hi!" } }] }' },
          { method: "GET", path: "/v1/models", description: "OpenAI-compatible model listing.", response: '{ "data": [{ "id": "llama3", "object": "model" }] }' },
        ]},
      ],
    },

    dotnet: {
      title: "DotNet Service Management API",
      manualPageId: "dotnet-manual",
      color: "#6d28d9",
      description: "Control your deployed .NET APIs. Replace {dashboard-ip}:{dashboard-port} with your dashboard address.",
      baseUrl: "http://{dashboard-ip}:{dashboard-port}",
      sections: [
        { name: "Service Management", endpoints: [
          { method: "GET", path: "/api/system/services?scope=dotnet", description: "List all .NET API services with their status.", response: '{ "ok": true, "services": [{ "name": "MyApi", "status": "running", "ports": [5000] }] }' },
          { method: "POST", path: "/api/system/service", description: "Control a service: start, stop, restart, or delete.", body: '{ "name": "MyApi", "action": "restart", "kind": "iis" }', response: '{ "ok": true, "message": "Service restarted" }' },
        ]},
      ],
    },

    python: {
      title: "Python Service Management API",
      manualPageId: "python-api-manual",
      color: "#0d9488",
      description: "Control your deployed Python APIs. Replace {dashboard-ip}:{dashboard-port} with your dashboard address.",
      baseUrl: "http://{dashboard-ip}:{dashboard-port}",
      sections: [
        { name: "Service Management", endpoints: [
          { method: "GET", path: "/api/system/services?scope=python", description: "List all Python API services with their status.", response: '{ "ok": true, "services": [{ "name": "my-flask", "status": "running" }] }' },
          { method: "POST", path: "/api/system/service", description: "Control a service: start, stop, restart, or delete.", body: '{ "name": "my-flask", "action": "restart" }', response: '{ "ok": true }' },
        ]},
      ],
    },

    tgwui: {
      title: "Text Generation WebUI API",
      manualPageId: "ai-tgwui-manual",
      color: "#7c3aed",
      description: "Oobabooga's Text Generation WebUI API. Replace {host}:{port} with your server address (default API port 5000, UI port 7860).",
      baseUrl: "http://{host}:5000",
      sections: [
        { name: "Chat & Generate", endpoints: [
          { method: "POST", path: "/api/v1/chat", description: "Chat completion with the loaded model.", body: '{ "messages": [{ "role": "user", "content": "Hello" }], "mode": "chat" }', response: '{ "choices": [{ "message": { "content": "Hi!" } }] }' },
          { method: "POST", path: "/api/v1/generate", description: "Text generation/completion.", body: '{ "prompt": "Once upon a time", "max_tokens": 200 }', response: '{ "results": [{ "text": "..." }] }' },
        ]},
        { name: "Model Management", endpoints: [
          { method: "GET", path: "/api/v1/model", description: "Get currently loaded model info.", response: '{ "result": "llama-2-7b" }' },
          { method: "POST", path: "/api/v1/model", description: "Load a different model.", body: '{ "model_name": "llama-2-7b" }', response: '{ "result": "ok" }' },
        ]},
      ],
    },

    comfyui: {
      title: "ComfyUI API",
      manualPageId: "ai-comfyui-manual",
      color: "#7c3aed",
      description: "ComfyUI workflow execution API. Replace {host}:{port} with your server address (default port 8188).",
      baseUrl: "http://{host}:8188",
      sections: [
        { name: "Workflow Execution", endpoints: [
          { method: "POST", path: "/prompt", description: "Queue a workflow (JSON node graph) for execution.", body: '{ "prompt": { "3": { "class_type": "KSampler", "inputs": {...} } } }', response: '{ "prompt_id": "abc123" }' },
          { method: "GET", path: "/history/{prompt_id}", description: "Get execution history and output images.", response: '{ "abc123": { "outputs": { "9": { "images": [{ "filename": "output.png" }] } } } }' },
          { method: "GET", path: "/view?filename={name}", description: "Download a generated image by filename.", response: "image/png binary" },
        ]},
        { name: "System Info", endpoints: [
          { method: "GET", path: "/system_stats", description: "Get GPU, VRAM, and CPU stats.", response: '{ "system": { "vram_total": 8589934592, "vram_free": 4294967296 } }' },
          { method: "GET", path: "/object_info", description: "List all available node types and their inputs/outputs.", response: '{ "KSampler": { "input": {...}, "output": [...] } }' },
        ]},
      ],
    },

    whisper: {
      title: "Whisper Speech-to-Text API",
      manualPageId: "ai-whisper-manual",
      color: "#0d9488",
      description: "Upload audio files and get text transcriptions. Replace {host}:{port} with your Whisper server address (default port 9000).",
      baseUrl: "http://{host}:9000",
      sections: [
        { name: "Transcription", endpoints: [
          { method: "POST", path: "/transcribe", description: "Transcribe an audio file to text. Supports WAV, MP3, M4A, FLAC, OGG formats.", body: "multipart/form-data: audio (file)", response: '{ "ok": true, "text": "Hello world, this is a test.", "language": "en" }' },
        ]},
        { name: "System", endpoints: [
          { method: "GET", path: "/health", description: "Health check \u2014 shows model name and status.", response: '{ "ok": true, "status": "healthy", "model": "base" }' },
          { method: "GET", path: "/", description: "Service info.", response: '{ "service": "whisper", "model": "base", "status": "running" }' },
        ]},
      ],
    },

    piper: {
      title: "Piper Text-to-Speech API",
      manualPageId: "ai-piper-manual",
      color: "#b45309",
      description: "Send text, receive synthesized speech audio. Replace {host}:{port} with your Piper server address (default port 5500).",
      baseUrl: "http://{host}:5500",
      sections: [
        { name: "Speech Synthesis", endpoints: [
          { method: "POST", path: "/tts", description: "Convert text to speech. Returns WAV audio file that can be played directly.", body: '{ "text": "Hello world, how are you?", "voice": "en_US-lessac-medium" }', response: "audio/wav binary (playable audio)" },
        ]},
        { name: "System", endpoints: [
          { method: "GET", path: "/health", description: "Health check \u2014 shows voice and status.", response: '{ "ok": true, "status": "healthy", "voice": "en_US-lessac-medium" }' },
          { method: "GET", path: "/", description: "Service info.", response: '{ "service": "piper-tts", "voice": "en_US-lessac-medium", "status": "running" }' },
        ]},
      ],
    },
  };

  ns.manualInstallDocs = {
    "s3-manual": {
      title: "S3 Manual Installation",
      backPageId: "s3",
      backLabel: "S3",
      chip: "MinIO",
      color: "#0f766e",
      description: "Install and expose a MinIO S3-compatible storage service manually, then verify the API and console ports.",
      steps: [
        { title: "1. Download MinIO server", note: "Use the official MinIO binary for the host OS.", code: "curl -L https://dl.min.io/server/minio/release/linux-amd64/minio -o minio\nchmod +x minio" },
        { title: "2. Create a data directory and credentials", note: "Set the root user and password before starting the server.", code: "mkdir -p /srv/minio/data\nexport MINIO_ROOT_USER=admin\nexport MINIO_ROOT_PASSWORD=StrongPassword123" },
        { title: "3. Start the API and console", note: "Expose the S3 API and the web console on separate ports.", code: "./minio server /srv/minio/data --address :9000 --console-address :9001" },
        { title: "4. Optional: run MinIO with Docker", note: "Use Docker if you want the service isolated in a container.", code: "docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=admin -e MINIO_ROOT_PASSWORD=StrongPassword123 -v minio-data:/data quay.io/minio/minio server /data --console-address ':9001'" },
      ],
      footer: "After startup, verify the console and API endpoints from the S3 page and use the API docs card to test `/api/s3/health`.",
    },
    "mongo-manual": {
      title: "MongoDB Manual Installation",
      backPageId: "mongo",
      backLabel: "MongoDB",
      chip: "Native or Docker",
      color: "#15803d",
      description: "Install MongoDB manually on the host or with Docker, then confirm the database port is reachable before using the dashboard.",
      steps: [
        { title: "1. Install MongoDB Community Server", note: "Use your OS package manager or the official MongoDB installer.", code: "sudo apt-get update\nsudo apt-get install -y mongodb-org" },
        { title: "2. Start and enable the MongoDB service", note: "Ensure the service starts automatically on boot.", code: "sudo systemctl enable mongod\nsudo systemctl start mongod\nsudo systemctl status mongod" },
        { title: "3. Verify the server responds", note: "Confirm the local database server is accepting connections.", code: "mongosh --eval \"db.adminCommand({ ping: 1 })\"" },
        { title: "4. Optional: run MongoDB with Docker", note: "Containerized deployment alternative.", code: "docker run -d --name mongodb -p 27017:27017 -v mongo-data:/data/db mongo:latest" },
      ],
      footer: "After MongoDB is up, return to the MongoDB page and use the API docs section to verify `/api/mongo/health`.",
    },
    "proxy-manual": {
      title: "Proxy Manual Installation",
      backPageId: "proxy",
      backLabel: "Proxy",
      chip: "WSL or Linux",
      color: "#1d4ed8",
      description: "Install the proxy stack manually, choose the protocol layer you need, and confirm the panel is reachable before adding users.",
      steps: [
        { title: "1. Prepare the Linux environment", note: "Use a native Linux host or a WSL distro on Windows.", code: "sudo apt-get update\nsudo apt-get install -y curl git nginx" },
        { title: "2. Clone the proxy project", note: "Use the vendored project or clone the upstream source into a working directory.", code: "git clone <your-proxy-project-url> proxy-stack\ncd proxy-stack" },
        { title: "3. Configure the desired layer", note: "Pick the layer mode and provide domain/email details if the chosen mode requires them.", code: "cp .env.example .env\n# edit layer, domain, email, and panel port values" },
        { title: "4. Start the services", note: "Bring up the proxy panel and the selected transport stack.", code: "docker compose up -d\n# or start the native services/scripts required by the chosen layer" },
      ],
      footer: "After the panel is online, use the Proxy page and the API docs card to confirm `/api/proxy/health` and service status.",
    },
    "dotnet-manual": {
      title: ".NET Manual Installation",
      backPageId: "dotnet",
      backLabel: ".NET",
      chip: "IIS, Linux, or Docker",
      color: "#6d28d9",
      description: "Publish your .NET app, choose a hosting target, and start it as a managed service or container.",
      steps: [
        { title: "1. Publish the application", note: "Build a release publish output for the target runtime.", code: "dotnet publish -c Release -o ./publish" },
        { title: "2. Run it directly on the host", note: "Use this for a Linux service or a direct Windows process.", code: "cd publish\ndotnet YourApp.dll" },
        { title: "3. Optional: host behind IIS", note: "For Windows IIS deployments, point a site or application pool at the published directory.", code: "Install Hosting Bundle\nCreate IIS site/app\nSet the physical path to the publish folder" },
        { title: "4. Optional: run with Docker", note: "Container deployment alternative.", code: "docker build -t my-dotnet-app .\ndocker run -d -p 8080:8080 my-dotnet-app" },
      ],
      footer: "After deployment, return to the .NET page and verify the service appears in the dashboard before using the management API.",
    },
    "python-api-manual": {
      title: "Python API Manual Installation",
      backPageId: "python-api",
      backLabel: "Python API",
      chip: "OS, Docker, or IIS",
      color: "#0d9488",
      description: "Set up a Python virtual environment, install your app dependencies, and run the API on the chosen hosting target.",
      steps: [
        { title: "1. Create a virtual environment", note: "Use an isolated environment for the app runtime.", code: "python -m venv .venv\n.venv\\Scripts\\activate    # Windows\n# source .venv/bin/activate # Linux/macOS" },
        { title: "2. Install dependencies", note: "Install the framework and your project requirements.", code: "pip install -r requirements.txt" },
        { title: "3. Start the API manually", note: "Pick the startup command that matches your framework.", code: "uvicorn app:app --host 0.0.0.0 --port 8000\n# or: waitress-serve --host 0.0.0.0 --port 8000 app:app" },
        { title: "4. Optional: run with Docker or IIS", note: "Use Docker for containers or IIS on Windows if required.", code: "docker build -t my-python-api .\ndocker run -d -p 8000:8000 my-python-api" },
      ],
      footer: "After the API is reachable, return to the Python API page and use the service-management API docs to verify the deployment.",
    },
    "ai-tgwui-manual": {
      title: "Text Generation WebUI Manual Installation",
      backPageId: "ai-tgwui",
      backLabel: "Text Generation WebUI",
      chip: "GPU recommended",
      color: "#7c3aed",
      description: "Clone Oobabooga Text Generation WebUI, install the runtime, and start the API server manually.",
      steps: [
        { title: "1. Clone the repository", note: "Get the upstream WebUI project onto the host.", code: "git clone https://github.com/oobabooga/text-generation-webui.git\ncd text-generation-webui" },
        { title: "2. Install dependencies", note: "Use the project installer or create your own Python environment.", code: "./start_linux.sh --api --listen\n# or on Windows: start_windows.bat --api --listen" },
        { title: "3. Load a model", note: "Download or mount a model before serving requests.", code: "# add models under the models/ directory\n# then start the UI and load the model" },
        { title: "4. Optional: run with Docker", note: "Use a container if you prefer isolation.", code: "docker run -d -p 7860:7860 -p 5000:5000 --gpus all --name tgwui atinoda/text-generation-webui:latest" },
      ],
      footer: "Once the API is available, go back to the Text Generation WebUI page and use the API docs card to validate the chat endpoint.",
    },
    "ai-comfyui-manual": {
      title: "ComfyUI Manual Installation",
      backPageId: "ai-comfyui",
      backLabel: "ComfyUI",
      chip: "Workflow Server",
      color: "#7c3aed",
      description: "Install ComfyUI manually, then start the workflow server and verify the API port.",
      steps: [
        { title: "1. Clone ComfyUI", note: "Download the application source onto the host.", code: "git clone https://github.com/comfyanonymous/ComfyUI.git\ncd ComfyUI" },
        { title: "2. Install dependencies", note: "Create a Python environment and install the requirements.", code: "python -m venv venv\nvenv\\Scripts\\pip install -r requirements.txt    # Windows\n# venv/bin/pip install -r requirements.txt         # Linux/macOS" },
        { title: "3. Start the server", note: "Expose the web UI and API on the ComfyUI port.", code: "python main.py --listen 0.0.0.0 --port 8188" },
        { title: "4. Optional: run with Docker", note: "Container deployment alternative.", code: "docker run -d -p 8188:8188 --gpus all --name comfyui ghcr.io/comfyanonymous/comfyui:latest" },
      ],
      footer: "After ComfyUI starts, use the ComfyUI page and API docs to verify `/system_stats` and workflow execution.",
    },
    "ai-whisper-manual": {
      title: "Whisper Manual Installation",
      backPageId: "ai-whisper",
      backLabel: "Whisper",
      chip: "Speech to Text",
      color: "#0d9488",
      description: "Set up a Python environment for Whisper, install the speech-to-text dependencies, and run the transcription service manually.",
      steps: [
        { title: "1. Create a Python environment", note: "Use a dedicated environment for the Whisper API.", code: "python -m venv whisper-venv\nwhisper-venv\\Scripts\\activate    # Windows\n# source whisper-venv/bin/activate # Linux/macOS" },
        { title: "2. Install Whisper and API dependencies", note: "Install the Whisper packages plus a lightweight web server.", code: "pip install openai-whisper faster-whisper flask" },
        { title: "3. Start the transcription service", note: "Run the server on the port expected by the dashboard.", code: "python app.py\n# ensure it listens on 0.0.0.0:9000" },
        { title: "4. Optional: run with Docker", note: "Container deployment alternative.", code: "docker run -d -p 9000:9000 --name whisper-server serverinstaller/whisper:latest" },
      ],
      footer: "After startup, use the Whisper page and the API docs card to verify `/health` and test a transcription upload.",
    },
    "ai-piper-manual": {
      title: "Piper Manual Installation",
      backPageId: "ai-piper",
      backLabel: "Piper",
      chip: "Text to Speech",
      color: "#b45309",
      description: "Install Piper, download a voice model, and start the TTS service manually.",
      steps: [
        { title: "1. Download Piper", note: "Use the Piper release that matches your operating system.", code: "Download Piper from https://github.com/rhasspy/piper/releases\nExtract the archive on the host" },
        { title: "2. Download a voice model", note: "At least one `.onnx` voice file is required before starting the service.", code: "Download a voice such as en_US-lessac-medium.onnx\nPlace the voice files in the Piper models directory" },
        { title: "3. Start the TTS service", note: "Expose the Piper API on the configured port.", code: "python app.py --host 0.0.0.0 --port 5500 --voice en_US-lessac-medium" },
        { title: "4. Optional: run with Docker", note: "Container deployment alternative.", code: "docker run -d -p 5500:5500 --name piper serverinstaller/piper:latest" },
      ],
      footer: "After the service starts, use the Piper page and the API docs card to test `/tts` and `/health`.",
    },
  };

  Object.keys(ns.manualInstallDocs).forEach(function(pageId) {
    ns.pages = ns.pages || {};
    ns.pages[pageId] = function(p) {
      return ns.renderManualInstallPage ? ns.renderManualInstallPage(p, ns.manualInstallDocs[pageId]) : null;
    };
  });
})();
