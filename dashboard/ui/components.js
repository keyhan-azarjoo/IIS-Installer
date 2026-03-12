const {
  Box, Button, Card, CardContent, FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField, Typography
} = MaterialUI;

function Field({ field, value, onChange, error, helperText, formHelperTextProps }) {
  const isPassword = field.type === "password";
  const [showPassword, setShowPassword] = React.useState(false);
  const controlled = typeof value !== "undefined";
  const trailingAction = field.trailingAction || null;
  if (field.type === "folder") {
    return (
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>
          {field.label}
        </Typography>
        <input type="file" name={field.name} webkitdirectory="" directory="" multiple />
      </Box>
    );
  }
  if (field.type === "file") {
    return (
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>
          {field.label}
        </Typography>
        <input type="file" name={field.name} />
      </Box>
    );
  }
  if (field.type === "select") {
    return (
      <FormControl fullWidth size="small" required={!!field.required} sx={{ mb: 1.5 }}>
        <InputLabel>{field.label}</InputLabel>
        <Select
          name={field.name}
          {...(controlled ? { value: value ?? "" } : { defaultValue: field.defaultValue || "" })}
          label={field.label}
          required={!!field.required}
          onChange={onChange}
          error={!!error}
        >
          {field.required && !field.defaultValue && (
            <MenuItem value="" disabled>{field.placeholder || `Select ${field.label}`}</MenuItem>
          )}
          {(field.options || []).map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }
  const endActions = [];
  if (isPassword) {
    endActions.push(
      <Button
        key="toggle-password"
        type="button"
        size="small"
        onClick={() => setShowPassword((v) => !v)}
        sx={{ minWidth: 0, px: 1, textTransform: "none", fontWeight: 700 }}
      >
        {showPassword ? "Hide" : "Show"}
      </Button>
    );
  }
  if (trailingAction) {
    endActions.push(
      <Button
        key="trailing-action"
        type="button"
        size="small"
        onClick={() => {
          if (typeof trailingAction.onClick === "function") {
            trailingAction.onClick();
          } else if (trailingAction.href) {
            window.open(trailingAction.href, trailingAction.target || "_blank", "noopener,noreferrer");
          }
        }}
        sx={{ minWidth: 0, px: 1, textTransform: "none", fontWeight: 700 }}
      >
        {trailingAction.label || "Open"}
      </Button>
    );
  }
  return (
    <TextField
      fullWidth
      size="small"
      type={isPassword && showPassword ? "text" : (isPassword ? "password" : "text")}
      name={field.name}
      label={field.label}
      {...(controlled ? { value: value ?? "" } : { defaultValue: field.defaultValue || "" })}
      placeholder={field.placeholder || ""}
      required={!!field.required}
      onChange={onChange}
      error={!!error}
      helperText={helperText}
      FormHelperTextProps={formHelperTextProps}
      InputProps={endActions.length ? {
        endAdornment: (
          <InputAdornment position="end">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {endActions}
            </Box>
          </InputAdornment>
        ),
      } : undefined}
      sx={{ mb: 1.5 }}
    />
  );
}

function ActionCard({ title, description, action, fields, onRun, color }) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadInfo, setUploadInfo] = React.useState("");
  const [uploadedPath, setUploadedPath] = React.useState("");
  const s3Actions = ["/run/s3_linux", "/run/s3_windows", "/run/s3_windows_iis", "/run/s3_windows_docker"];
  const isS3Install = s3Actions.includes(action);
  const s3PortFieldNames = ["LOCALS3_HTTPS_PORT", "LOCALS3_API_PORT", "LOCALS3_UI_PORT", "LOCALS3_CONSOLE_PORT"];
  const fieldSignature = React.useMemo(
    () => JSON.stringify((fields || []).map((f) => ({
      name: f.name,
      defaultValue: f.defaultValue ?? "",
      required: !!f.required,
      placeholder: f.placeholder ?? "",
      type: f.type ?? "text",
    }))),
    [fields]
  );
  const s3PortFields = React.useMemo(
    () => (fields || []).filter((f) => s3PortFieldNames.includes(f.name)),
    [fieldSignature]
  );
  const initialS3PortValues = React.useMemo(() => {
    const next = {};
    for (const field of s3PortFields) {
      next[field.name] = field.defaultValue ? String(field.defaultValue) : "";
    }
    return next;
  }, [fieldSignature, s3PortFields]);
  const initialS3PortStates = React.useMemo(() => {
    const next = {};
    for (const field of s3PortFields) {
      next[field.name] = { checking: false, usable: true, error: false, message: "" };
    }
    return next;
  }, [fieldSignature, s3PortFields]);
  const [s3PortValues, setS3PortValues] = React.useState(initialS3PortValues);
  const [s3PortStates, setS3PortStates] = React.useState(initialS3PortStates);
  const uploadInputRef = React.useRef(null);
  const formRef = React.useRef(null);
  const s3ValidationRunRef = React.useRef(0);
  const sourcePathField = (fields || []).find((f) => f.name === "SourceValue" || f.name === "SOURCE_VALUE");
  const sourcePathKey = sourcePathField ? sourcePathField.name : "";

  React.useEffect(() => {
    setS3PortValues(initialS3PortValues);
    setS3PortStates(initialS3PortStates);
  }, [initialS3PortStates, initialS3PortValues]);

  const emitTerminal = React.useCallback((state, line) => {
    if (!window.ServerInstallerTerminalHook) return;
    window.ServerInstallerTerminalHook({
      open: true,
      state,
      line,
    });
  }, []);

  const setSourcePathInForm = (pathValue) => {
    if (!formRef.current || !sourcePathKey) return;
    const pathInput = formRef.current.querySelector(`[name="${sourcePathKey}"]`);
    if (pathInput) {
      pathInput.value = pathValue || "";
      pathInput.dispatchEvent(new Event("input", { bubbles: true }));
      pathInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const doUpload = async () => {
    const input = uploadInputRef.current;
    if (!input || !input.files || input.files.length === 0) {
      setUploadInfo("Select a folder or archive first.");
      return "";
    }
    setUploading(true);
    setUploadInfo("Uploading...");
    if (window.ServerInstallerTerminalHook) {
      window.ServerInstallerTerminalHook({
        open: true,
        state: `Uploading for: ${title}`,
        line: `[${new Date().toLocaleTimeString()}] Upload started for ${title}`,
      });
    }
    try {
      const fd = new FormData();
      for (const f of input.files) {
        const rel = (f.webkitRelativePath && f.webkitRelativePath.length > 0) ? f.webkitRelativePath : f.name;
        fd.append("SourceUpload", f, rel);
      }
      const res = await fetch("/upload/source", {
        method: "POST",
        headers: { "X-Requested-With": "fetch" },
        body: fd,
      });
      const rawText = await res.text();
      let json = {};
      try {
        json = JSON.parse(rawText);
      } catch (_) {
        json = { ok: false, error: rawText || `HTTP ${res.status}` };
      }
      if (!json.ok) {
        console.error("Upload failed response:", { status: res.status, body: rawText, parsed: json });
        throw new Error(json.error || "Upload failed");
      }
      setUploadedPath(json.path || "");
      setSourcePathInForm(json.path || "");
      setUploadInfo("Uploaded and extracted on server.");
      if (window.ServerInstallerTerminalHook) {
        window.ServerInstallerTerminalHook({
          open: true,
          state: `Uploading for: ${title}`,
          line: `[${new Date().toLocaleTimeString()}] Upload completed. Server path: ${json.path || ""}`,
        });
      }
      return json.path || "";
    } catch (err) {
      console.error("Upload exception:", err);
      setUploadInfo(`Upload failed: ${err}`);
      if (window.ServerInstallerTerminalHook) {
        window.ServerInstallerTerminalHook({
          open: true,
          state: "Error",
          line: `[${new Date().toLocaleTimeString()}] Upload failed: ${err}`,
        });
      }
      return "";
    } finally {
      setUploading(false);
    }
  };

  const validateS3Ports = React.useCallback(async (nextValues) => {
    if (!isS3Install || s3PortFields.length === 0) return;
    const fieldNames = s3PortFields.map((f) => f.name);
    const nextStates = {};
    const numericValues = {};
    const duplicates = new Set();

    for (const fieldName of fieldNames) {
      const rawValue = String(nextValues[fieldName] || "").trim();
      if (!rawValue) {
        nextStates[fieldName] = { checking: false, usable: false, error: true, message: "Port is required." };
        continue;
      }
      if (!/^\d+$/.test(rawValue) || Number(rawValue) < 1 || Number(rawValue) > 65535) {
        nextStates[fieldName] = { checking: false, usable: false, error: true, message: "Port must be a number between 1 and 65535." };
        continue;
      }
      if (fieldName === "LOCALS3_HTTPS_PORT" && Number(rawValue) === 443) {
        nextStates[fieldName] = { checking: false, usable: false, error: true, message: "S3 HTTPS port 443 is not allowed. Choose a different port." };
        continue;
      }
      const key = Number(rawValue);
      if (Object.prototype.hasOwnProperty.call(numericValues, key)) {
        duplicates.add(fieldName);
        duplicates.add(numericValues[key]);
      } else {
        numericValues[key] = fieldName;
      }
      nextStates[fieldName] = { checking: true, usable: false, error: false, message: "Checking port availability..." };
    }

    duplicates.forEach((fieldName) => {
      nextStates[fieldName] = { checking: false, usable: false, error: true, message: "All S3 ports must be unique." };
    });
    setS3PortStates(nextStates);

    const fieldsToCheck = fieldNames.filter((fieldName) => nextStates[fieldName] && nextStates[fieldName].checking);
    if (fieldsToCheck.length === 0) {
      setS3PortStates(nextStates);
      return;
    }

    const validationRun = ++s3ValidationRunRef.current;
    const resolvedStates = { ...nextStates };
    await Promise.all(fieldsToCheck.map(async (fieldName) => {
      const port = String(nextValues[fieldName] || "").trim();
      try {
        const fd = new FormData();
        fd.append("port", port);
        fd.append("protocol", "tcp");
        const resp = await fetch("/api/system/port_check", {
          method: "POST",
          headers: { "X-Requested-With": "fetch" },
          body: fd,
        });
        const j = await resp.json();
        if (!j.ok) {
          resolvedStates[fieldName] = { checking: false, usable: false, error: true, message: j.error || "Could not validate port availability." };
          return;
        }
        if (j.busy && !j.managed_owner) {
          resolvedStates[fieldName] = { checking: false, usable: false, error: true, message: `Port ${port} is already in use by another service.` };
          return;
        }
        if (j.busy && j.managed_owner) {
          resolvedStates[fieldName] = { checking: false, usable: true, error: false, message: `Port ${port} is already used by this S3 install and can be reused.` };
          return;
        }
        resolvedStates[fieldName] = { checking: false, usable: true, error: false, message: `Port ${port} is available.` };
      } catch (err) {
        resolvedStates[fieldName] = { checking: false, usable: false, error: true, message: `Port check failed: ${err}` };
      }
    }));
    if (validationRun === s3ValidationRunRef.current) {
      setS3PortStates(resolvedStates);
    }
  }, [isS3Install, s3PortFields]);

  React.useEffect(() => {
    if (!isS3Install || s3PortFields.length === 0) return;
    validateS3Ports(initialS3PortValues);
  }, [initialS3PortValues, isS3Install, s3PortFields.length, validateS3Ports]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formEl = formRef.current || e.currentTarget;
    emitTerminal(`Starting: ${title}`, "============================================================");
    emitTerminal(`Starting: ${title}`, `[${new Date().toLocaleTimeString()}] ${title} requested`);
    if (formEl && typeof formEl.reportValidity === "function" && !formEl.reportValidity()) {
      const firstInvalid = formEl.querySelector(":invalid");
      const invalidLabel = firstInvalid ? (firstInvalid.getAttribute("aria-label") || firstInvalid.getAttribute("name") || "required field") : "required field";
      emitTerminal("Validation", `[${new Date().toLocaleTimeString()}] ${title} blocked: fill in ${invalidLabel}.`);
      return;
    }
    if (isS3Install) {
      const activeS3PortFieldNames = s3PortFields.map((field) => field.name);
      for (const fieldName of activeS3PortFieldNames) {
        const state = s3PortStates[fieldName];
        if (state && (state.checking || !state.usable)) {
          emitTerminal("Validation", `[${new Date().toLocaleTimeString()}] ${title} blocked: ${state.message || `${fieldName} is not ready.`}`);
          return;
        }
      }
      const s3Ports = [];
      for (const fieldName of activeS3PortFieldNames) {
        const input = formEl.querySelector(`[name="${fieldName}"]`);
        const value = String(input && input.value ? input.value : "").trim();
        if (!value) {
          emitTerminal("Validation", `[${new Date().toLocaleTimeString()}] ${title} blocked: ${fieldName} is required.`);
          return;
        }
        if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
          emitTerminal("Validation", `[${new Date().toLocaleTimeString()}] ${title} blocked: ${fieldName} must be a number between 1 and 65535.`);
          return;
        }
        s3Ports.push({ fieldName, value: Number(value) });
      }
      const seen = new Set();
      for (const item of s3Ports) {
        if (seen.has(item.value)) {
          emitTerminal("Validation", `[${new Date().toLocaleTimeString()}] ${title} blocked: all S3 ports must be unique.`);
          window.alert("All S3 ports must be unique.");
          return;
        }
        seen.add(item.value);
      }
    }
    let sourcePathValue = "";
    if (sourcePathKey) {
      const sourcePathInput = formEl.querySelector(`[name="${sourcePathKey}"]`);
      sourcePathValue = (sourcePathInput && sourcePathInput.value ? sourcePathInput.value : "").trim();
    }

    const input = uploadInputRef.current;
    const hasSelectedUpload = !!(input && input.files && input.files.length > 0);

    if (!sourcePathValue && hasSelectedUpload && !uploadedPath) {
      emitTerminal(`Uploading for: ${title}`, "============================================================");
      const autoPath = await doUpload();
      if (!autoPath) {
        return;
      }
      sourcePathValue = autoPath;
      emitTerminal(`Starting: ${title}`, `[${new Date().toLocaleTimeString()}] Upload finished, continuing deployment...`);
    }

    onRun(e, action, title);
  };

  return (
    <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6", boxShadow: "0 10px 26px rgba(15,23,42,.08)" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
        <Box ref={formRef} component="form" onSubmit={handleSubmit}>
          {(fields || []).map((f) => {
            if (isS3Install && s3PortFieldNames.includes(f.name)) {
              const fieldState = s3PortStates[f.name] || { checking: false, usable: true, error: false, message: "" };
              return (
                <Field
                  key={f.name}
                  field={f}
                  value={s3PortValues[f.name] ?? ""}
                  onChange={(ev) => {
                    const nextValues = { ...s3PortValues, [f.name]: ev.target.value };
                    setS3PortValues(nextValues);
                    validateS3Ports(nextValues);
                  }}
                  error={fieldState.error}
                  helperText={fieldState.message || " "}
                  formHelperTextProps={{
                    sx: fieldState.error ? { color: "error.main", fontWeight: 700 } : {},
                  }}
                />
              );
            }
            return <Field key={f.name} field={f} />;
          })}
          {(fields || []).some((f) => f.enableUpload) && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>
                Upload Published Folder or Archive
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <input ref={uploadInputRef} type="file" webkitdirectory="" directory="" multiple />
                <Button type="button" variant="outlined" onClick={doUpload} disabled={uploading} sx={{ textTransform: "none", fontWeight: 700 }}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </Box>
              {!!uploadInfo && <Typography variant="caption" sx={{ color: "text.secondary" }}>{uploadInfo}</Typography>}
              {!!uploadedPath && <Typography variant="caption" sx={{ display: "block", color: "success.main" }}>Server path: {uploadedPath}</Typography>}
            </Box>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={uploading || (isS3Install && s3PortFields.some((field) => {
              const fieldName = field.name;
              const state = s3PortStates[fieldName];
              return state && (state.checking || !state.usable);
            }))}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: color || "#1d4ed8" }}
          >
            Start
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

function NavCard({ title, text, onClick, outlined }) {
  return (
    <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6", height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.8 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{text}</Typography>
        <Button
          fullWidth
          variant={outlined ? "outlined" : "contained"}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          onClick={onClick}
        >
          Open
        </Button>
      </CardContent>
    </Card>
  );
}

window.ServerInstallerUI = window.ServerInstallerUI || {};
window.ServerInstallerUI.components = { Field, ActionCard, NavCard };
