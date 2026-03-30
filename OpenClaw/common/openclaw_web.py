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
from flask import Flask, render_template, request, jsonify, Response

app = Flask(__name__,
    template_folder=os.path.join(os.path.dirname(__file__), "web", "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "web", "static"),
)

AUTH_USERNAME = os.environ.get("OPENCLAW_AUTH_USERNAME", "")
AUTH_PASSWORD = os.environ.get("OPENCLAW_AUTH_PASSWORD", "")

# LLM backend — try Ollama first, then OpenAI
OLLAMA_URLS = ["http://127.0.0.1:11434", "http://127.0.0.1:8080"]
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


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
            return Response("Unauthorized", 401, {"WWW-Authenticate": 'Basic realm="OpenClaw"'})
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

    # Try Ollama
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
        except Exception as e:
            pass

    # Try OpenAI
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
    """Stream messages from the LLM as a generator of content chunks.

    Yields individual content token strings from Ollama's streaming /api/chat
    endpoint.  Falls back to a single-chunk yield from OpenAI (non-streaming)
    when Ollama is unavailable.
    """
    import requests

    # Try Ollama streaming
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

    # Fallback: OpenAI (non-streaming, yield entire response at once)
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
                content = data["choices"][0]["message"]["content"]
                yield content
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


@app.route("/")
@_require_auth
def index():
    try:
        return render_template("index.html")
    except Exception:
        # Fallback inline HTML if template not found
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
    """Streaming version of /api/run — sends SSE events as the LLM generates tokens."""
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
            # Emit each complete line as it forms; also emit partial tokens
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                yield f"data: {json.dumps({'line': line})}\n\n"
        # Flush any remaining text that didn't end with a newline
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
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0f172a;color:#e2e8f0;height:100vh;display:flex;flex-direction:column}
.h{background:#1e293b;border-bottom:1px solid #334155;padding:12px 24px;display:flex;align-items:center;gap:16px}
.h h1{font-size:20px;font-weight:800;color:#f97316}.h .s{margin-left:auto;font-size:13px;color:#94a3b8}
.h .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
.h .dot.ok{background:#22c55e}.h .dot.no{background:#ef4444}
.c{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:80%;display:flex;flex-direction:column}.msg.u{align-self:flex-end}.msg.a{align-self:flex-start}
.msg .b{padding:14px 18px;border-radius:16px;line-height:1.6;font-size:15px;white-space:pre-wrap;word-break:break-word}
.msg.u .b{background:#f97316;color:#fff;border-bottom-right-radius:4px}
.msg.a .b{background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-bottom-left-radius:4px}
.empty{text-align:center;margin:auto;color:#475569}.empty h2{font-size:28px;font-weight:800;color:#334155;margin-bottom:8px}
.i{background:#1e293b;border-top:1px solid #334155;padding:16px 24px}
.ir{display:flex;gap:12px;max-width:900px;margin:0 auto}
.ir textarea{flex:1;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:12px;padding:12px 16px;font-size:15px;font-family:inherit;resize:none;outline:none;min-height:48px;max-height:200px}
.ir textarea:focus{border-color:#f97316}
.sb{background:#f97316;color:#fff;border:none;border-radius:12px;padding:0 20px;font-size:15px;font-weight:700;cursor:pointer;min-width:80px}
.sb:hover{background:#ea580c}.sb:disabled{background:#334155;color:#64748b}</style></head>
<body>
<div class="h"><h1>OpenClaw</h1><div class="s"><span class="dot" id="dot"></span><span id="st">Checking...</span></div></div>
<div class="c" id="chat"><div class="empty"><h2>OpenClaw Agent</h2><p>Ask anything or describe a task.</p></div></div>
<div class="i"><div class="ir">
<textarea id="inp" placeholder="Ask anything..." rows="1"></textarea>
<button class="sb" id="btn" onclick="send()">Send</button>
</div></div>
<script>
let msgs=[];let busy=false;
async function ck(){try{const r=await fetch('/api/health');const j=await r.json();
document.getElementById('dot').className='dot '+(j.ok?'ok':'no');
document.getElementById('st').textContent=j.ok?(j.llm_model?'Ready ('+j.llm_model+')':'Ready'):'No LLM';
}catch(e){document.getElementById('dot').className='dot no';document.getElementById('st').textContent='Offline';}}
function addMsg(role,text){const c=document.getElementById('chat');
if(c.querySelector('.empty'))c.innerHTML='';
const d=document.createElement('div');d.className='msg '+(role==='user'?'u':'a');
d.innerHTML='<div class="b"></div>';d.querySelector('.b').textContent=text;
c.appendChild(d);c.scrollTop=c.scrollHeight;return d;}
async function send(){const inp=document.getElementById('inp');const t=inp.value.trim();
if(!t||busy)return;busy=true;document.getElementById('btn').disabled=true;
msgs.push({role:'user',content:t});addMsg('user',t);inp.value='';
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:msgs})});
const j=await r.json();const content=j.content||j.output||j.error||'No response';
msgs.push({role:'assistant',content:content});addMsg('assistant',content);
}catch(e){addMsg('assistant','Error: '+e);}
busy=false;document.getElementById('btn').disabled=false;inp.focus();}
document.getElementById('inp').addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,200)+'px';});
document.getElementById('inp').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
ck();setInterval(ck,15000);
</script></body></html>"""


if __name__ == "__main__":
    port = int(os.environ.get("OPENCLAW_WEB_PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
