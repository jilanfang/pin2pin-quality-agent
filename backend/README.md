# Backend

Create and activate the local environment:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install pytest fastapi httpx pydantic sqlalchemy
```

Run tests:

```bash
cd backend && .venv/bin/python -m pytest tests -v
```

Configure an OpenAI-compatible LLM provider:

```bash
export LLM_BASE_URL="https://api.vectorengine.ai"
export LLM_API_KEY="your-key"
export LLM_MODEL="gpt-5.4-mini"
```

Or copy the local env template and fill it in:

```bash
cd backend
cp .env.example .env
```

Run a live LLM connectivity check:

```bash
cd backend && .venv/bin/python scripts/test_llm_connection.py
```
