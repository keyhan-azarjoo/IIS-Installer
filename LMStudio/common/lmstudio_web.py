#!/usr/bin/env python3
"""
LM Studio Web UI — Chat interface and API proxy for LM Studio.
"""
import os
import json
import requests
from flask import Flask, render_template, request, jsonify, Response, stream_with_context

app = Flask(__name__,
    template_folder=os.path.join(os.path.dirname(__file__), "web", "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "web", "static"),
)

LMSTUDIO_BASE = os.environ.get("LMSTUDIO_API_BASE", "http://127.0.0.1:1234")
AUTH_USERNAME = os.environ.get("LMSTUDIO_AUTH_USERNAME", "")
AUTH_PASSWORD = os.environ.get("LMSTUDIO_AUTH_PASSWORD", "")


def _check_auth():
    if not AUTH_USERNAME:
        return True
    auth = request.authorization
    return auth and auth.username == AUTH_USERNAME and auth.password == AUTH_PASSWORD


def _require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _check_auth():
            return Response("Unauthorized", 401, {"WWW-Authenticate": 'Basic realm="LM Studio"'})
        return f(*args, **kwargs)
    return decorated


def _lms(method, path, json_data=None, stream=False, timeout=120):
    url = f"{LMSTUDIO_BASE}{path}"
    try:
        r = requests.request(method, url, json=json_data, stream=stream, timeout=timeout)
        if stream:
            return r
        return r.json() if "json" in r.headers.get("content-type", "") else {"raw": r.text}
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot connect to LM Studio. Is it running? Start it from the LM Studio app or run: lms server start"}
    except Exception as e:
        return {"error": str(e)}


@app.route("/")
@_require_auth
def index():
    return render_template("index.html")


@app.route("/api/health")
def health():
    try:
        r = requests.get(f"{LMSTUDIO_BASE}/v1/models", timeout=5)
        return jsonify({"ok": True, "status": "healthy", "lmstudio": LMSTUDIO_BASE})
    except Exception:
        return jsonify({"ok": False, "status": "unhealthy", "lmstudio": LMSTUDIO_BASE}), 503


# ── Model Management ─────────────────────────────────────────────────────────

@app.route("/api/models")
@_require_auth
def list_models():
    result = _lms("GET", "/v1/models")
    if "error" in result:
        return jsonify({"ok": False, "error": result["error"]}), 500
    models = result.get("data", [])
    return jsonify({"ok": True, "models": models})


# ── Chat (OpenAI-compatible) ─────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
@_require_auth
def chat():
    data = request.get_json(silent=True) or {}
    model = data.get("model", "")
    messages = data.get("messages", [])
    stream = data.get("stream", True)

    if not model:
        # Auto-select first available model
        models = _lms("GET", "/v1/models")
        if models.get("data"):
            model = models["data"][0].get("id", "")

    payload = {"model": model, "messages": messages, "stream": stream}
    # Pass through optional parameters
    for key in ("temperature", "top_p", "max_tokens", "frequency_penalty", "presence_penalty"):
        if key in data:
            payload[key] = data[key]

    if stream:
        def generate():
            try:
                r = _lms("POST", "/v1/chat/completions", payload, stream=True)
                if isinstance(r, dict) and "error" in r:
                    yield f'data: {{"error":"{r["error"]}"}}\n\n'
                    return
                for line in r.iter_lines():
                    if line:
                        decoded = line.decode()
                        # LM Studio returns "data: ..." lines, strip prefix if present
                        if decoded.startswith("data: "):
                            yield f"{decoded}\n\n"
                        else:
                            yield f"data: {decoded}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f'data: {{"error":"{e}"}}\n\n'
        return Response(stream_with_context(generate()), mimetype="text/event-stream")
    else:
        result = _lms("POST", "/v1/chat/completions", payload)
        if "error" in result:
            return jsonify({"ok": False, "error": result["error"]}), 500
        return jsonify({"ok": True, **result})


@app.route("/api/generate", methods=["POST"])
@_require_auth
def generate():
    data = request.get_json(silent=True) or {}
    model = data.get("model", "")
    prompt = data.get("prompt", "")
    payload = {"model": model, "prompt": prompt, "max_tokens": data.get("max_tokens", 512)}
    result = _lms("POST", "/v1/completions", payload)
    if "error" in result:
        return jsonify({"ok": False, "error": result["error"]}), 500
    return jsonify({"ok": True, **result})


@app.route("/api/embeddings", methods=["POST"])
@_require_auth
def embeddings():
    data = request.get_json(silent=True) or {}
    result = _lms("POST", "/v1/embeddings", data)
    if "error" in result:
        return jsonify({"ok": False, "error": result["error"]}), 500
    return jsonify({"ok": True, **result})


# ── OpenAI-compatible passthrough ────────────────────────────────────────────

@app.route("/v1/chat/completions", methods=["POST"])
@_require_auth
def v1_chat():
    return jsonify(_lms("POST", "/v1/chat/completions", request.get_json(silent=True)))


@app.route("/v1/completions", methods=["POST"])
@_require_auth
def v1_completions():
    return jsonify(_lms("POST", "/v1/completions", request.get_json(silent=True)))


@app.route("/v1/models")
@_require_auth
def v1_models():
    return jsonify(_lms("GET", "/v1/models"))


@app.route("/v1/embeddings", methods=["POST"])
@_require_auth
def v1_embeddings():
    return jsonify(_lms("POST", "/v1/embeddings", request.get_json(silent=True)))


if __name__ == "__main__":
    port = int(os.environ.get("LMSTUDIO_WEB_PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
