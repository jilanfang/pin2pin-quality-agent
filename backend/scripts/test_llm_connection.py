import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.llm_client import get_llm_client_from_env


PROMPT = """请只输出严格 JSON：
{
  "ok": true,
  "provider": "vectorengine",
  "model": "gpt-5.4-mini"
}"""


def main() -> int:
    client = get_llm_client_from_env()
    if client is None:
        print("Missing LLM_BASE_URL / LLM_API_KEY / LLM_MODEL", file=sys.stderr)
        return 1

    payload = client.generate_json(PROMPT)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
