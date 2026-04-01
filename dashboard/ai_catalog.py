from copy import deepcopy


GENERIC_AI_SERVICES = {
    "vllm": {
        "display_name": "vLLM",
        "default_port": "8000",
        "container_port": "8000",
        "image": "vllm/vllm-openai:latest",
        "gpu_runtime": "nvidia",
        "default_model": "Qwen/Qwen2.5-0.5B-Instruct",
        "model_field": "VLLM_MODEL",
        "docker_command": [
            "--host", "0.0.0.0",
            "--port", "8000",
            "--model", "{model}",
        ],
    },
    "llamacpp": {
        "display_name": "llama.cpp",
        "default_port": "8080",
        "container_port": "8080",
        "image": "ghcr.io/ggerganov/llama.cpp:server",
        "default_model": "bartowski/Qwen2.5-0.5B-Instruct-GGUF:Q4_K_M",
        "model_field": "LLAMACPP_MODEL",
        "docker_command": [
            "-hf", "{model}",
            "--host", "0.0.0.0",
            "--port", "8080",
        ],
    },
    "deepseek": {
        "display_name": "DeepSeek",
        "default_port": "11434",
        "container_port": "11434",
        "image": "ollama/ollama:latest",
        "default_model": "deepseek-r1:7b",
        "model_field": "DEEPSEEK_MODEL",
        "docker_volumes": ["deepseek-ollama-data:/root/.ollama"],
        "post_start_exec": [["ollama", "pull", "{model}"]],
    },
    "localai": {
        "display_name": "LocalAI",
        "default_port": "8080",
        "container_port": "8080",
        "image": "localai/localai:latest-aio-cpu",
        "gpu_runtime": "optional-nvidia",
        "gpu_image": "localai/localai:latest-aio-gpu-nvidia-cuda-12",
        "docker_volumes": ["localai-models:/build/models"],
    },
    "sdwebui": {
        "display_name": "Stable Diffusion WebUI",
        "default_port": "7860",
        "container_port": "7860",
        "image": "universonic/stable-diffusion-webui:latest",
        "gpu_runtime": "nvidia",
    },
    "fooocus": {
        "display_name": "Fooocus",
        "default_port": "7865",
        "container_port": "7865",
        "image": "ashleykza/fooocus:latest",
        "gpu_runtime": "nvidia",
    },
    "coqui": {
        "display_name": "Coqui TTS",
        "default_port": "5002",
        "container_port": "5002",
        "image": "ghcr.io/coqui-ai/tts:latest",
        "default_model": "tts_models/en/ljspeech/tacotron2-DDC",
        "model_field": "COQUI_MODEL",
        "docker_command": [
            "tts-server",
            "--model_name", "{model}",
            "--port", "5002",
        ],
    },
    "bark": {
        "display_name": "Bark",
        "default_port": "5005",
        "container_port": "5005",
        "image": "",
    },
    "rvc": {
        "display_name": "RVC",
        "default_port": "7897",
        "container_port": "7897",
        "image": "alexta69/rvc-webui:latest",
        "gpu_runtime": "nvidia",
    },
    "openwebui": {
        "display_name": "Open WebUI",
        "default_port": "3000",
        "container_port": "8080",
        "image": "ghcr.io/open-webui/open-webui:main",
        "docker_volumes": ["open-webui-data:/app/backend/data"],
        "docker_args": ["--add-host", "host.docker.internal:host-gateway"],
    },
    "chromadb": {
        "display_name": "ChromaDB",
        "default_port": "8000",
        "container_port": "8000",
        "image": "chromadb/chroma:latest",
        "docker_volumes": ["chromadb-data:/chroma/chroma"],
    },
    "custom": {
        "display_name": "Custom Model",
        "default_port": "8080",
        "container_port": "8080",
        "image": "",
    },
}


def list_generic_ai_service_ids():
    return list(GENERIC_AI_SERVICES.keys())


def is_generic_ai_service(service_id):
    return str(service_id or "").strip().lower() in GENERIC_AI_SERVICES


def get_generic_ai_service(service_id):
    key = str(service_id or "").strip().lower()
    svc = GENERIC_AI_SERVICES.get(key)
    if not svc:
        raise KeyError(f"Unknown generic AI service: {service_id}")
    data = deepcopy(svc)
    data["service_id"] = key
    return data
