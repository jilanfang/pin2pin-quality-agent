import json
import os
from pathlib import Path
from typing import Protocol

import httpx


class LLMClient(Protocol):
    def generate_json(self, prompt: str) -> dict:
        ...


class OpenAICompatibleLLMClient:
    def __init__(self, base_url: str, api_key: str, model: str) -> None:
        normalized = base_url.rstrip("/")
        if not normalized.endswith("/v1"):
            normalized = f"{normalized}/v1"
        self.base_url = normalized
        self.api_key = api_key
        self.model = model

    def generate_json(self, prompt: str) -> dict:
        response = httpx.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
            },
            timeout=30.0,
        )
        response.raise_for_status()
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        return json.loads(content)


def _load_dotenv_if_present() -> None:
    if os.getenv("LLM_DISABLE_DOTENV") == "1":
        return
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parents[2] / ".env",
    ]
    for path in candidates:
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
        break


def get_llm_client_from_env() -> LLMClient | None:
    _load_dotenv_if_present()
    base_url = os.getenv("LLM_BASE_URL")
    api_key = os.getenv("LLM_API_KEY")
    model = os.getenv("LLM_MODEL")
    if not (base_url and api_key and model):
        return None
    return OpenAICompatibleLLMClient(base_url=base_url, api_key=api_key, model=model)
