(() => {
  const ns = window.ServerInstallerUI = window.ServerInstallerUI || {};
  ns.pages = ns.pages || {};

  ns.pages["ai-ollama"] = function renderOllamaPage(p) {
    const {
      Grid, Card, CardContent, Typography, Stack, Button, Box, Paper, Chip, Alert,
      ActionCard, NavCard, TextField, FormControl, InputLabel, Select, MenuItem,
      cfg, run, selectableIps, serviceBusy,
      isScopeLoading, scopeErrors,
      isServiceRunningStatus, formatServiceState, onServiceAction, IconOnlyAction, FolderIcon,
      renderServiceUrls, renderServicePorts, renderServiceStatus, renderFolderIcon,
      setPage, setInfoMessage, setFileManagerPath,
    } = p;

    // Read ollama state from the generic AI service state
    const ollamaInfo = (p.ollamaService) || {};
    const services = p.ollamaPageServices || [];
    const loadInfo = p.loadOllamaInfo;
    const loadServices = p.loadOllamaServices;

    const httpUrl = String(ollamaInfo.http_url || "").trim();
    const httpsUrl = String(ollamaInfo.https_url || "").trim();
    const httpPort = String(ollamaInfo.http_port || "11434").trim();
    const installed = !!ollamaInfo.installed;
    const running = !!ollamaInfo.running;
    const bestUrl = httpsUrl || httpUrl || (installed ? `http://127.0.0.1:${httpPort}` : "");

    // Model management state
    const [models, setModels] = React.useState([]);
    const [modelLoading, setModelLoading] = React.useState(false);
    const [pullName, setPullName] = React.useState("llama3.2");
    const [pulling, setPulling] = React.useState(false);
    const [chatModel, setChatModel] = React.useState("");
    const [chatInput, setChatInput] = React.useState("");
    const [chatMessages, setChatMessages] = React.useState([]);
    const [chatLoading, setChatLoading] = React.useState(false);
    const chatEndRef = React.useRef(null);

    // Load models when running
    const refreshModels = React.useCallback(async () => {
      if (!running && !installed) return;
      setModelLoading(true);
      try {
        const r = await fetch("/api/ollama/tags", { headers: { "X-Requested-With": "fetch" } });
        const j = await r.json();
        if (j.ok && j.models) {
          setModels(j.models);
          if (!chatModel && j.models.length > 0) setChatModel(j.models[0].name || j.models[0].model || "");
        }
      } catch (e) {}
      setModelLoading(false);
    }, [running, installed, chatModel]);

    React.useEffect(() => { if (running) refreshModels(); }, [running]);

    // Pull a model
    const handlePull = React.useCallback(async () => {
      if (!pullName.trim()) return;
      setPulling(true);
      try {
        const r = await fetch("/api/ollama/pull", {
          method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
          body: JSON.stringify({ name: pullName.trim() }),
        });
        const j = await r.json();
        if (j.ok) {
          if (setInfoMessage) setInfoMessage(`Model "${pullName}" pulled successfully.`);
          refreshModels();
        } else {
          if (setInfoMessage) setInfoMessage(`Pull failed: ${j.error || "Unknown error"}`);
        }
      } catch (e) {
        if (setInfoMessage) setInfoMessage(`Pull error: ${e}`);
      }
      setPulling(false);
    }, [pullName, refreshModels, setInfoMessage]);

    // Delete a model
    const handleDelete = React.useCallback(async (name) => {
      if (!window.confirm(`Delete model "${name}"?`)) return;
      try {
        const r = await fetch("/api/ollama/delete", {
          method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
          body: JSON.stringify({ name }),
        });
        refreshModels();
      } catch (e) {}
    }, [refreshModels]);

    // Chat
    const handleChat = React.useCallback(async () => {
      if (!chatInput.trim() || !chatModel) return;
      const userMsg = { role: "user", content: chatInput.trim() };
      const newMsgs = [...chatMessages, userMsg];
      setChatMessages(newMsgs);
      setChatInput("");
      setChatLoading(true);
      try {
        const r = await fetch("/api/ollama/chat", {
          method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
          body: JSON.stringify({ model: chatModel, messages: newMsgs }),
        });
        const j = await r.json();
        if (j.ok && j.message) {
          setChatMessages([...newMsgs, j.message]);
        } else {
          setChatMessages([...newMsgs, { role: "assistant", content: `Error: ${j.error || "No response"}` }]);
        }
      } catch (e) {
        setChatMessages([...newMsgs, { role: "assistant", content: `Error: ${e}` }]);
      }
      setChatLoading(false);
    }, [chatInput, chatModel, chatMessages]);

    React.useEffect(() => {
      if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const installOsLabel = cfg.os === "windows" ? "Windows" : (cfg.os === "linux" ? "Linux" : (cfg.os === "darwin" ? "macOS" : cfg.os_label));

    const commonFields = [
      { name: "OLLAMA_HOST_IP", label: "Host IP", type: "select", options: selectableIps, defaultValue: selectableIps[0] || "", required: true, placeholder: "Select IP" },
      { name: "OLLAMA_HTTP_PORT", label: "HTTP Port", defaultValue: httpPort || "11434", checkPort: true },
      { name: "OLLAMA_HTTPS_PORT", label: "HTTPS Port (optional)", defaultValue: "", checkPort: true, certSelect: "SSL_CERT_NAME", placeholder: "Leave empty to skip HTTPS" },
      { name: "OLLAMA_DOMAIN", label: "Domain (optional)", defaultValue: ollamaInfo.domain || "", placeholder: "e.g. ollama.example.com" },
      { name: "OLLAMA_USERNAME", label: "Username (optional)", defaultValue: "", placeholder: "Leave empty for no auth" },
      { name: "OLLAMA_PASSWORD", label: "Password (optional)", type: "password", defaultValue: "", placeholder: "Leave empty for no auth" },
    ];

    const popularModels = [
      { name: "llama3.2", desc: "Meta's Llama 3.2 (3B) — fast, general purpose", size: "2 GB" },
      { name: "llama3.1:8b", desc: "Meta's Llama 3.1 (8B) — balanced quality", size: "4.7 GB" },
      { name: "mistral", desc: "Mistral 7B — excellent reasoning", size: "4.1 GB" },
      { name: "gemma2:2b", desc: "Google Gemma 2 (2B) — lightweight", size: "1.6 GB" },
      { name: "phi3:mini", desc: "Microsoft Phi-3 Mini — small but capable", size: "2.3 GB" },
      { name: "codellama", desc: "Meta's Code Llama — coding tasks", size: "3.8 GB" },
      { name: "deepseek-coder-v2:lite", desc: "DeepSeek Coder V2 Lite — code generation", size: "8.9 GB" },
      { name: "qwen2.5:7b", desc: "Alibaba Qwen 2.5 (7B) — multilingual", size: "4.7 GB" },
      { name: "nomic-embed-text", desc: "Nomic Embed — text embeddings", size: "274 MB" },
    ];

    const formatSize = (bytes) => {
      if (!bytes) return "";
      const gb = bytes / 1073741824;
      return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1048576).toFixed(0)} MB`;
    };

    return (
      <Grid container spacing={2}>
        {/* ── Description ── */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, color: "#1e40af" }}>
                Ollama — Run LLMs Locally
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Ollama runs large language models locally with an OpenAI-compatible API. Chat with Llama 3, Mistral,
                Gemma, Phi, DeepSeek, CodeLlama, and hundreds more. Supports GPU acceleration (NVIDIA, AMD, Apple Silicon).
              </Typography>
              <Alert severity="info" sx={{ mt: 1, borderRadius: 2 }}>
                Ollama requires at least 4 GB RAM for small models (3B) and 8+ GB for larger models (7B+).
                GPU acceleration dramatically improves performance — NVIDIA GPUs with 6+ GB VRAM recommended.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Install Cards ── */}
        <Grid item xs={12} md={cfg.os === "windows" ? 4 : 6}>
          <ActionCard
            title={`Install Ollama — OS (${installOsLabel})`}
            description="Install Ollama as a managed OS service. Downloads the official binary and configures auto-start."
            action={cfg.os === "windows" ? "/run/ollama_windows_os" : "/run/ollama_unix_os"}
            fields={commonFields}
            onRun={run}
            color="#1e40af"
          />
        </Grid>
        <Grid item xs={12} md={cfg.os === "windows" ? 4 : 6}>
          <ActionCard
            title="Install Ollama — Docker"
            description="Deploy Ollama in a Docker container with optional GPU passthrough."
            action="/run/ollama_docker"
            fields={commonFields}
            onRun={run}
            color="#0891b2"
          />
        </Grid>
        {cfg.os === "windows" && (
          <Grid item xs={12} md={4}>
            <ActionCard
              title="Install Ollama — IIS"
              description="Ollama with IIS reverse proxy for HTTPS."
              action="/run/ollama_windows_iis"
              fields={commonFields}
              onRun={run}
              color="#d97706"
            />
          </Grid>
        )}

        {/* ── Status ── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6", height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: "#1e40af" }}>Ollama Status</Typography>
              <Typography variant="body2">Installed: <Chip size="small" label={installed ? "Yes" : "No"} color={installed ? "success" : "default"} sx={{ ml: 0.5 }} /></Typography>
              <Typography variant="body2">Running: <Chip size="small" label={running ? "Running" : "Stopped"} color={running ? "success" : "warning"} sx={{ ml: 0.5 }} /></Typography>
              <Typography variant="body2">Port: <b>{httpPort}</b></Typography>
              {httpUrl && <Typography variant="body2" sx={{ mt: 0.5, wordBreak: "break-all" }}>URL: <a href={httpUrl} target="_blank" rel="noopener">{httpUrl}</a></Typography>}
              <Typography variant="body2">Models loaded: <b>{models.length}</b></Typography>
              {bestUrl && (
                <Button
                  variant="contained" size="small" sx={{ mt: 1, textTransform: "none", bgcolor: "#1e40af" }}
                  onClick={() => window.open(bestUrl, "_blank", "noopener,noreferrer")}
                >
                  Open Ollama API
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Model Management ── */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>Models</Typography>
                <Button variant="outlined" size="small" disabled={modelLoading} onClick={refreshModels} sx={{ textTransform: "none" }}>
                  {modelLoading ? "Loading..." : "Refresh"}
                </Button>
              </Stack>

              {/* Pull new model */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                <TextField
                  size="small" label="Pull Model" placeholder="e.g. llama3.2, mistral, gemma2"
                  value={pullName} onChange={(e) => setPullName(e.target.value)}
                  sx={{ flexGrow: 1 }}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePull(); }}
                />
                <Button variant="contained" disabled={pulling || !pullName.trim()} onClick={handlePull} sx={{ textTransform: "none", bgcolor: "#1e40af", minWidth: 100 }}>
                  {pulling ? "Pulling..." : "Pull"}
                </Button>
              </Stack>

              {/* Popular models quick-pull */}
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: "block" }}>Popular Models (click to pull):</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {popularModels.map((m) => (
                  <Chip
                    key={m.name}
                    label={`${m.name} (${m.size})`}
                    size="small"
                    variant="outlined"
                    onClick={() => { setPullName(m.name); }}
                    sx={{ cursor: "pointer", fontSize: 11, "&:hover": { bgcolor: "#eff6ff", borderColor: "#1e40af" } }}
                    title={m.desc}
                  />
                ))}
              </Stack>

              {/* Installed models list */}
              {models.length === 0 && !modelLoading && (
                <Typography variant="body2" color="text.secondary">No models downloaded yet. Pull a model to get started.</Typography>
              )}
              {models.map((m) => (
                <Paper key={m.name || m.model} variant="outlined" sx={{ p: 1, mb: 0.5, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ flexGrow: 1 }}><b>{m.name || m.model}</b></Typography>
                    {m.size && <Chip label={formatSize(m.size)} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />}
                    {m.details?.parameter_size && <Chip label={m.details.parameter_size} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />}
                    <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(m.name || m.model)} sx={{ textTransform: "none", fontSize: 11 }}>
                      Delete
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Chat UI ── */}
        {running && models.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, border: "1px solid #1e40af33" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: "#1e40af" }}>Chat</Typography>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select value={chatModel} onChange={(e) => { setChatModel(e.target.value); setChatMessages([]); }} size="small">
                      {models.map((m) => <MenuItem key={m.name || m.model} value={m.name || m.model}>{m.name || m.model}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button size="small" variant="text" onClick={() => setChatMessages([])} sx={{ textTransform: "none" }}>Clear</Button>
                </Stack>

                {/* Messages */}
                <Paper elevation={0} sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2, p: 2, minHeight: 200, maxHeight: 400, overflowY: "auto", mb: 1.5 }}>
                  {chatMessages.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 6 }}>
                      Start a conversation with {chatModel}
                    </Typography>
                  )}
                  {chatMessages.map((msg, i) => (
                    <Box key={i} sx={{ mb: 1.5, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <Paper elevation={0} sx={{
                        p: 1.5, borderRadius: 2, maxWidth: "80%",
                        bgcolor: msg.role === "user" ? "#1e40af" : "#fff",
                        color: msg.role === "user" ? "#fff" : "#1f2937",
                        border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                      }}>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</Typography>
                      </Paper>
                    </Box>
                  ))}
                  {chatLoading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">Thinking...</Typography>
                    </Box>
                  )}
                  <div ref={chatEndRef} />
                </Paper>

                {/* Input */}
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small" fullWidth placeholder="Type a message..."
                    value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                    disabled={chatLoading}
                    multiline maxRows={3}
                  />
                  <Button variant="contained" disabled={chatLoading || !chatInput.trim()} onClick={handleChat} sx={{ textTransform: "none", bgcolor: "#1e40af", minWidth: 80 }}>
                    Send
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ── Services List ── */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6" }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={800}>Ollama Services</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button variant="outlined" disabled={isScopeLoading("ollama")} onClick={() => { if (loadInfo?.current) loadInfo.current(); if (loadServices?.current) loadServices.current(); }} sx={{ textTransform: "none" }}>
                  {isScopeLoading("ollama") ? "Refreshing..." : "Refresh"}
                </Button>
              </Stack>
              {scopeErrors.ollama && <Alert severity="error" sx={{ mb: 1 }}>{scopeErrors.ollama}</Alert>}
              {services.length === 0 && (
                <Typography variant="body2" color="text.secondary">No Ollama services deployed yet. Use an Install card above.</Typography>
              )}
              {services.map((svc) => (
                <Paper key={`ollama-${svc.kind}-${svc.name}`} variant="outlined" sx={{ p: 1, mb: 1, borderRadius: 2 }}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                    <Box sx={{ minWidth: 250 }}>
                      <Typography variant="body2"><b>{svc.name}</b> ({svc.kind})</Typography>
                      {renderServiceUrls(svc)}
                      {renderServicePorts(svc)}
                    </Box>
                    {renderServiceStatus(svc)}
                    <Box sx={{ flexGrow: 1 }} />
                    {renderFolderIcon(svc)}
                    {svc.manageable !== false && (
                      <>
                        <Button size="small" variant="outlined" color={isServiceRunningStatus(svc.status, svc.sub_status) ? "error" : "success"} disabled={serviceBusy} onClick={() => onServiceAction(isServiceRunningStatus(svc.status, svc.sub_status) ? "stop" : "start", svc)} sx={{ textTransform: "none" }}>
                          {isServiceRunningStatus(svc.status, svc.sub_status) ? "Stop" : "Start"}
                        </Button>
                        <Button size="small" variant="outlined" disabled={serviceBusy} onClick={() => onServiceAction("restart", svc)} sx={{ textTransform: "none" }}>Restart</Button>
                      </>
                    )}
                    {svc.deletable && (
                      <Button size="small" variant="outlined" color="error" disabled={serviceBusy} onClick={() => onServiceAction("delete", svc)} sx={{ textTransform: "none" }}>Delete</Button>
                    )}
                  </Stack>
                </Paper>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* ── API Documents Button ── */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: "1.5px solid #1e40af44", background: "linear-gradient(135deg, #1e40af05 0%, #ffffff 100%)" }}>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 6, height: 36, borderRadius: 3, bgcolor: "#1e40af" }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: "#1e40af" }}>Ollama API Documentation</Typography>
                  <Typography variant="caption" color="text.secondary">OpenAI-compatible API — chat, generate, embeddings, model management</Typography>
                </Box>
                <Chip label="12 endpoints" size="small" sx={{ bgcolor: "#1e40af15", color: "#1e40af", fontWeight: 700, border: "1px solid #1e40af33" }} />
                <Button variant="contained" size="small" onClick={() => setPage("ai-ollama-api")} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700, bgcolor: "#1e40af", "&:hover": { bgcolor: "#1d4ed8" }, px: 3 }}>
                  API Documents
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // ── Ollama API Documentation Page ───────────────────────────────────────────
  ns.pages["ai-ollama-api"] = function renderOllamaApiPage(p) {
    const { Grid, Card, CardContent, Typography, Stack, Button, Box, Paper, Chip, Tooltip, Alert, setPage, copyText } = p;
    const ollamaInfo = p.ollamaService || {};
    const host = String(ollamaInfo.host || "").trim() || "{host}";
    const port = String(ollamaInfo.http_port || "11434").trim();
    const base = "http://" + (host === "0.0.0.0" ? "127.0.0.1" : host) + ":" + port;

    const MC = { GET: { bg: "#dcfce7", c: "#166534", b: "#86efac" }, POST: { bg: "#dbeafe", c: "#1e40af", b: "#93c5fd" }, DELETE: { bg: "#fee2e2", c: "#991b1b", b: "#fca5a5" } };
    const mc = (m) => MC[m] || { bg: "#f3f4f6", c: "#374151", b: "#d1d5db" };
    const doCopy = (text) => { if (copyText) copyText(text, "cURL"); else if (navigator.clipboard) navigator.clipboard.writeText(text); };

    const sections = [
      { name: "Chat & Generate", color: "#1e40af", eps: [
        { m: "POST", p: "/api/chat", d: "Chat with a model. Send messages and get the assistant response. Supports streaming.", body: '{\n  "model": "llama3.2",\n  "messages": [\n    { "role": "user", "content": "Hello!" }\n  ],\n  "stream": false\n}', res: '{\n  "model": "llama3.2",\n  "message": {\n    "role": "assistant",\n    "content": "Hi there! How can I help?"\n  },\n  "done": true\n}' },
        { m: "POST", p: "/api/generate", d: "Generate text completion from a prompt.", body: '{\n  "model": "llama3.2",\n  "prompt": "Write a haiku about coding",\n  "stream": false\n}', res: '{\n  "model": "llama3.2",\n  "response": "Lines of code unfold..."\n}' },
        { m: "POST", p: "/api/embeddings", d: "Generate vector embeddings for text. Useful for RAG and semantic search.", body: '{\n  "model": "llama3.2",\n  "prompt": "Hello world"\n}', res: '{\n  "embedding": [0.123, -0.456, 0.789, ...]\n}' },
      ]},
      { name: "Model Management", color: "#059669", eps: [
        { m: "GET", p: "/api/tags", d: "List all downloaded models with name, size, and parameter count.", res: '{\n  "models": [\n    { "name": "llama3.2:latest", "size": 2000000000, "parameter_size": "3B" }\n  ]\n}' },
        { m: "POST", p: "/api/pull", d: "Download a model from the Ollama registry.", body: '{ "name": "llama3.2", "stream": false }', res: '{ "status": "success" }' },
        { m: "DELETE", p: "/api/delete", d: "Delete a downloaded model to free disk space.", body: '{ "name": "llama3.2" }', res: '{ "status": "success" }' },
        { m: "POST", p: "/api/show", d: "Show model details: Modelfile, parameters, template, license.", body: '{ "name": "llama3.2" }', res: '{\n  "modelfile": "FROM llama3.2...",\n  "parameters": "num_ctx 4096",\n  "template": "{{ .System }}"\n}' },
        { m: "GET", p: "/api/ps", d: "List models currently loaded in GPU/CPU memory.", res: '{\n  "models": [{ "name": "llama3.2", "size": 2000000000 }]\n}' },
        { m: "POST", p: "/api/copy", d: "Copy a model under a new name (alias).", body: '{ "source": "llama3.2", "destination": "my-model" }', res: "200 OK" },
        { m: "POST", p: "/api/create", d: "Create a custom model from a Modelfile with system prompt.", body: '{\n  "name": "my-assistant",\n  "modelfile": "FROM llama3.2\\nSYSTEM You are a helpful coding assistant."\n}', res: '{ "status": "success" }' },
      ]},
      { name: "OpenAI-Compatible (v1)", color: "#7c3aed", eps: [
        { m: "POST", p: "/v1/chat/completions", d: "OpenAI-compatible chat completions. Works with any OpenAI SDK (Python, JS, etc.).", body: '{\n  "model": "llama3.2",\n  "messages": [\n    { "role": "user", "content": "Hello" }\n  ]\n}', res: '{\n  "choices": [{\n    "message": { "role": "assistant", "content": "Hi!" }\n  }]\n}' },
        { m: "GET", p: "/v1/models", d: "List models in OpenAI format.", res: '{\n  "data": [{ "id": "llama3.2", "object": "model" }]\n}' },
      ]},
    ];

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: "1.5px solid #1e40af44" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <Button variant="outlined" size="small" onClick={() => setPage("ai-ollama")} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700, borderColor: "#1e40af", color: "#1e40af" }}>
                  Back to Ollama
                </Button>
                <Typography variant="h5" fontWeight={900} sx={{ color: "#1e40af", flexGrow: 1 }}>Ollama API Documentation</Typography>
                <Chip label="12 endpoints" size="small" sx={{ bgcolor: "#1e40af15", color: "#1e40af", fontWeight: 700 }} />
              </Stack>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <b>Base URL:</b> <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{base}</code>
                {" "} — Ollama also supports the OpenAI /v1/ endpoints. Use any OpenAI SDK by pointing it to this base URL.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        {sections.map((sec, si) => (
          <Grid item xs={12} key={si}>
            <Card sx={{ borderRadius: 3, border: "1px solid " + sec.color + "33" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 5, height: 28, borderRadius: 3, bgcolor: sec.color }} />
                  <Typography variant="h6" fontWeight={800} sx={{ color: sec.color, flexGrow: 1 }}>{sec.name}</Typography>
                  <Chip label={sec.eps.length + " endpoints"} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                </Stack>
                {sec.eps.map((ep, ei) => {
                  const cl = mc(ep.m);
                  return (
                    <Paper key={ei} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, "&:hover": { borderColor: sec.color + "66" } }}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
                        <Chip label={ep.m} size="small" sx={{ bgcolor: cl.bg, color: cl.c, border: "1px solid " + cl.b, fontWeight: 800, fontFamily: "monospace", minWidth: 70, justifyContent: "center" }} />
                        <Typography sx={{ fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontWeight: 600, wordBreak: "break-all", flexGrow: 1, fontSize: 14 }}>{base}{ep.p}</Typography>
                        <Tooltip title="Copy cURL">
                          <Button size="small" variant="outlined" onClick={() => doCopy("curl -X " + ep.m + ' "' + base + ep.p + '"')} sx={{ textTransform: "none", minWidth: 0, px: 1.5, fontSize: 11, borderColor: "#e2e8f0" }}>cURL</Button>
                        </Tooltip>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{ep.d}</Typography>
                      {ep.body && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: "#475569" }}>Request Body:</Typography>
                          <Paper elevation={0} sx={{ mt: 0.3, p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", border: "1px solid #e2e8f0", lineHeight: 1.7 }}>{ep.body}</Paper>
                        </Box>
                      )}
                      {ep.res && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: "#475569" }}>Response:</Typography>
                          <Paper elevation={0} sx={{ mt: 0.3, p: 1.5, bgcolor: "#f0fdf4", borderRadius: 2, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", border: "1px solid #dcfce7", lineHeight: 1.7 }}>{ep.res}</Paper>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
})();

