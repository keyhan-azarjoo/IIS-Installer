#!/usr/bin/env python3
"""
OpenClaw Web UI — AI Agent interface powered by local LLMs.
Connects to Ollama or any OpenAI-compatible API to execute agent tasks.
"""
import os
import json
import subprocess
import sys
import shutil
import secrets
from functools import wraps
from flask import Flask, render_template, request, jsonify, Response, session, redirect, url_for

app = Flask(__name__,
    template_folder=os.path.join(os.path.dirname(__file__), "web", "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "web", "static"),
)
app.secret_key = os.environ.get("OPENCLAW_SECRET_KEY", secrets.token_hex(32))

AUTH_USERNAME = os.environ.get("OPENCLAW_AUTH_USERNAME", "")
AUTH_PASSWORD = os.environ.get("OPENCLAW_AUTH_PASSWORD", "")

# LLM backend — try Ollama first, then OpenAI
# LLM backend — try Ollama at multiple locations (host, Docker bridge, custom)
_ollama_env = os.environ.get("OLLAMA_URL", "").strip()
OLLAMA_URLS = [u for u in [_ollama_env, "http://host.docker.internal:11434", "http://127.0.0.1:11434", "http://127.0.0.1:8080"] if u]
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


def _check_auth():
    if not AUTH_USERNAME:
        return True
    if session.get("authenticated"):
        return True
    auth = request.authorization
    return auth and auth.username == AUTH_USERNAME and auth.password == AUTH_PASSWORD


def _require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _check_auth():
            if request.path.startswith("/api/") or request.path.startswith("/v1/"):
                return Response("Unauthorized", 401, {"WWW-Authenticate": 'Basic realm="OpenClaw"'})
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated


def _find_ollama():
    """Find a running Ollama instance and return (base_url, model_name) or (None, None)."""
    import requests
    for url in OLLAMA_URLS:
        try:
            r = requests.get(f"{url}/api/tags", timeout=3)
            if r.status_code == 200:
                models = r.json().get("models", [])
                if models:
                    name = models[0].get("name", models[0].get("model", ""))
                    return url, name
        except Exception:
            continue
    return None, None


def _chat_with_llm(messages, model=None):
    """Send messages to the LLM and get a response."""
    import requests

    ollama_url, default_model = _find_ollama()
    if ollama_url:
        use_model = model or default_model
        try:
            r = requests.post(
                f"{ollama_url}/api/chat",
                json={"model": use_model, "messages": messages, "stream": False},
                timeout=120,
            )
            if r.status_code == 200:
                data = r.json()
                return {
                    "ok": True,
                    "content": data.get("message", {}).get("content", ""),
                    "model": use_model,
                    "backend": "ollama",
                }
        except Exception:
            pass

    if OPENAI_API_KEY:
        try:
            r = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"model": model or "gpt-4o-mini", "messages": messages},
                timeout=120,
            )
            if r.status_code == 200:
                data = r.json()
                return {
                    "ok": True,
                    "content": data["choices"][0]["message"]["content"],
                    "model": model or "gpt-4o-mini",
                    "backend": "openai",
                }
        except Exception:
            pass

    return {"ok": False, "content": "", "error": "No LLM backend available. Install Ollama and pull a model, or set OPENAI_API_KEY."}


def _chat_with_llm_stream(messages, model=None):
    """Stream messages from the LLM."""
    import requests

    ollama_url, default_model = _find_ollama()
    if ollama_url:
        use_model = model or default_model
        try:
            r = requests.post(
                f"{ollama_url}/api/chat",
                json={"model": use_model, "messages": messages, "stream": True},
                timeout=300,
                stream=True,
            )
            if r.status_code == 200:
                for raw_line in r.iter_lines():
                    if not raw_line:
                        continue
                    try:
                        chunk = json.loads(raw_line)
                        token = chunk.get("message", {}).get("content", "")
                        if token:
                            yield token
                    except (json.JSONDecodeError, KeyError):
                        continue
                return
        except Exception:
            pass

    if OPENAI_API_KEY:
        try:
            r = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"model": model or "gpt-4o-mini", "messages": messages},
                timeout=120,
            )
            if r.status_code == 200:
                data = r.json()
                yield data["choices"][0]["message"]["content"]
                return
        except Exception:
            pass

    yield "[Error] No LLM backend available. Install Ollama and pull a model, or set OPENAI_API_KEY."


AGENT_SYSTEM_PROMPT = """You are OpenClaw, an AI agent assistant. You help users by:
1. Answering questions clearly and helpfully
2. Writing code when asked
3. Explaining concepts
4. Providing step-by-step instructions
5. Analyzing problems and suggesting solutions

Be concise, practical, and helpful. If asked to run code or commands, explain what the code does and provide it clearly formatted."""


# ── Auth Routes ─────────────────────────────────────────────────────────────

@app.route("/login", methods=["GET"])
def login_page():
    if not AUTH_USERNAME or _check_auth():
        return redirect("/")
    return render_template("login.html")


@app.route("/api/login", methods=["POST"])
def login():
    if not AUTH_USERNAME:
        return jsonify({"ok": True})
    data = request.get_json(silent=True) or {}
    if data.get("username") == AUTH_USERNAME and data.get("password") == AUTH_PASSWORD:
        session["authenticated"] = True
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "Invalid username or password"}), 401


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/auth-status")
def auth_status():
    return jsonify({"ok": True, "auth_required": bool(AUTH_USERNAME), "authenticated": _check_auth()})


# ── Pages ───────────────────────────────────────────────────────────────────

@app.route("/")
@_require_auth
def index():
    try:
        return render_template("index.html")
    except Exception:
        return _inline_html()


@app.route("/api/health")
def health():
    ollama_url, model = _find_ollama()
    return jsonify({
        "ok": True,
        "status": "healthy",
        "service": "openclaw",
        "llm_backend": "ollama" if ollama_url else ("openai" if OPENAI_API_KEY else "none"),
        "llm_model": model or "",
        "llm_url": ollama_url or "",
    })


@app.route("/api/chat", methods=["POST"])
@_require_auth
def chat():
    data = request.get_json(silent=True) or {}
    messages = data.get("messages", [])
    model = data.get("model", "")
    task = data.get("task", "")
    stream = data.get("stream", False)

    if task and not messages:
        messages = [
            {"role": "system", "content": AGENT_SYSTEM_PROMPT},
            {"role": "user", "content": task},
        ]

    if not messages:
        return jsonify({"ok": False, "error": "No messages or task provided."}), 400

    if stream:
        def _generate():
            for token in _chat_with_llm_stream(messages, model):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        return Response(_generate(), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    result = _chat_with_llm(messages, model)
    return jsonify(result)


@app.route("/api/run", methods=["POST"])
@_require_auth
def run_task():
    data = request.get_json(silent=True) or {}
    task = data.get("task", "").strip()
    if not task:
        return jsonify({"ok": False, "error": "Task description required."}), 400

    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": task},
    ]

    result = _chat_with_llm(messages)
    if result["ok"]:
        return jsonify({
            "ok": True,
            "output": result["content"],
            "model": result.get("model", ""),
            "backend": result.get("backend", ""),
        })
    return jsonify({"ok": False, "error": result.get("error", "Failed"), "output": ""})


@app.route("/api/run/stream", methods=["POST"])
@_require_auth
def run_task_stream():
    data = request.get_json(silent=True) or {}
    task = data.get("task", "").strip()
    if not task:
        return jsonify({"ok": False, "error": "Task description required."}), 400

    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": task},
    ]

    def _generate():
        buffer = ""
        for token in _chat_with_llm_stream(messages):
            buffer += token
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                yield f"data: {json.dumps({'line': line})}\n\n"
        if buffer:
            yield f"data: {json.dumps({'line': buffer})}\n\n"
        yield "data: [DONE]\n\n"

    return Response(_generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.route("/api/models")
@_require_auth
def list_models():
    import requests
    ollama_url, _ = _find_ollama()
    if ollama_url:
        try:
            r = requests.get(f"{ollama_url}/api/tags", timeout=5)
            models = r.json().get("models", [])
            return jsonify({"ok": True, "models": [m.get("name", m.get("model", "")) for m in models], "backend": "ollama"})
        except Exception:
            pass
    return jsonify({"ok": True, "models": [], "backend": "none"})


@app.route("/api/version")
def version():
    return jsonify({"ok": True, "version": "1.0.0", "service": "openclaw-web"})


def _inline_html():
    return """<!DOCTYPE html><html><head><meta charset=utf-8><title>OpenClaw</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
.c{text-align:center;padding:48px}.c h1{font-size:32px;color:#f97316;margin-bottom:12px}.c p{color:#94a3b8}</style></head>
<body><div class=c><h1>OpenClaw</h1><p>Web UI template not found. Reinstall from dashboard.</p></div></body></html>"""


if __name__ == "__main__":
    port = int(os.environ.get("OPENCLAW_WEB_PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
