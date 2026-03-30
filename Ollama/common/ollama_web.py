#!/usr/bin/env python3
"""
Ollama Web UI — A beautiful chat interface for Ollama LLMs.
Provides a web-based chat, model management, and API proxy.
"""
import os
import json
import time
import requests
from flask import Flask, render_template, request, jsonify, Response, stream_with_context

app = Flask(__name__,
    template_folder=os.path.join(os.path.dirname(__file__), "web", "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "web", "static"),
)

OLLAMA_BASE = os.environ.get("OLLAMA_API_BASE", "http://127.0.0.1:11434")
AUTH_USERNAME = os.environ.get("OLLAMA_AUTH_USERNAME", "")
AUTH_PASSWORD = os.environ.get("OLLAMA_AUTH_PASSWORD", "")


def _check_auth():
    """Check basic auth if configured."""
    if not AUTH_USERNAME:
        return True
    auth = request.authorization
    if auth and auth.username == AUTH_USERNAME and auth.password == AUTH_PASSWORD:
        return True
    return False


def _require_auth(f):
    """Decorator requiring auth."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _check_auth():
            return Response("Unauthorized", 401, {"WWW-Authenticate": 'Basic realm="Ollama"'})
        return f(*args, **kwargs)
    return decorated


def _ollama(method, path, json_data=None, stream=False, timeout=120):
    """Make a request to the Ollama API."""
    url = f"{OLLAMA_BASE}{path}"
    try:
        r = requests.request(method, url, json=json_data, stream=stream, timeout=timeout)
        if stream:
            return r
        return r.json() if r.headers.get("content-type", "").startswith("application/json") else {"raw": r.text}
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot connect to Ollama. Is the server running?"}
    except Exception as e:
        return {"error": str(e)}


# ── Web UI Routes ────────────────────────────────────────────────────────────

@app.route("/")
@_require_auth
def index():
    return render_template("index.html")


@app.route("/api/health")
def health():
    try:
        r = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=5)
        return jsonify({"ok": True, "status": "healthy", "ollama": OLLAMA_BASE})
    except Exception:
        return jsonify({"ok": False, "status": "unhealthy", "ollama": OLLAMA_BASE}), 503


# ── Model Management ─────────────────────────────────────────────────────────

@app.route("/api/models")
@_require_auth
def list_models():
    result = _ollama("GET", "/api/tags")
    if "error" in result:
        return jsonify({"ok": False, "error": result["error"]}), 500
    return jsonify({"ok": True, "models": result.get("models", [])})


@app.route("/api/models/pull", methods=["POST"])
@_require_auth
def pull_model():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "")
    if not name:
        return jsonify({"ok": False, "error": "Model name required"}), 400

    def generate():
        try:
            r = _ollama("POST", "/api/pull", {"name": name, "stream": True}, stream=True)
            for line in r.iter_lines():
                if line:
                    yield f"data: {line.decode()}\n\n"
            yield 'data: {"status":"success"}\n\n'
        except Exception as e:
            yield f'data: {{"error":"{e}"}}\n\n'

    return Response(stream_with_context(generate()), mimetype="text/event-stream")


@app.route("/api/models/delete", methods=["POST"])
@_require_auth
def delete_model():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "")
    if not name:
        return jsonify({"ok": False, "error": "Model name required"}), 400
    result = _ollama("DELETE", "/api/delete", {"name": name})
    return jsonify({"ok": "error" not in result})


@app.route("/api/models/info", methods=["POST"])
@_require_auth
def model_info():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "")
    result = _ollama("POST", "/api/show", {"name": name})
    if "error" in result:
        return jsonify({"ok": False, "error": result["error"]}), 500
    return jsonify({"ok": True, **result})


# ── Chat ─────────────────────────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
@_require_auth
def chat():
    data = request.get_json(silent=True) or {}
    model = data.get("model", "")
    messages = data.get("messages", [])
    stream = data.get("stream", True)

    if not model:
        return jsonify({"ok": False, "error": "Model name required"}), 400

    # Pass through options (temperature, top_p, num_ctx, num_predict, etc.)
    options = data.get("options", {})
    payload = {"model": model, "messages": messages, "stream": stream}
    if options:
        payload["options"] = options

    if stream:
        def generate():
            try:
                r = _ollama("POST", "/api/chat", {**payload, "stream": True}, stream=True)
                if isinstance(r, dict) and "error" in r:
                    yield f'data: {{"error":"{r["error"]}"}}\n\n'
                    return
                for line in r.iter_lines():
                    if line:
                        yield f"data: {line.decode()}\n\n"
            except Exception as e:
                yield f'data: {{"error":"{e}"}}\n\n'
        return Response(stream_with_context(generate()), mimetype="text/event-stream")
    else:
        result = _ollama("POST", "/api/chat", {**payload, "stream": False})
        if "error" in result:
            return jsonify({"ok": False, "error": result["error"]}), 500
        return jsonify({"ok": True, **result})


@app.route("/api/generate", methods=["POST"])
@_require_auth
def generate():
    data = request.get_json(silent=True) or {}
    model = data.get("model", "")
    prompt = data.get("prompt", "")
    result = _ollama("POST", "/api/generate", {"model": model, "prompt": prompt, "stream": False})
    if "error" in result:
        return jsonify({"ok": False, "error": result["error"]}), 500
    return jsonify({"ok": True, **result})


# ── Proxy all other Ollama API calls ─────────────────────────────────────────

@app.route("/api/tags")
@_require_auth
def proxy_tags():
    return jsonify(_ollama("GET", "/api/tags"))


@app.route("/api/ps")
@_require_auth
def proxy_ps():
    return jsonify(_ollama("GET", "/api/ps"))


@app.route("/api/embeddings", methods=["POST"])
@_require_auth
def proxy_embeddings():
    return jsonify(_ollama("POST", "/api/embeddings", request.get_json(silent=True)))


@app.route("/v1/chat/completions", methods=["POST"])
@_require_auth
def proxy_v1_chat():
    """OpenAI-compatible endpoint proxy."""
    data = request.get_json(silent=True) or {}
    result = _ollama("POST", "/v1/chat/completions", data)
    return jsonify(result)


@app.route("/v1/models")
@_require_auth
def proxy_v1_models():
    return jsonify(_ollama("GET", "/v1/models"))


if __name__ == "__main__":
    port = int(os.environ.get("OLLAMA_WEBUI_PORT", 3080))
    app.run(host="0.0.0.0", port=port, debug=False)
