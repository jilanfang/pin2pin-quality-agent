from pathlib import Path

from app.services.llm_client import OpenAICompatibleLLMClient, get_llm_client_from_env


def test_get_llm_client_from_env_returns_none_when_config_missing(monkeypatch, tmp_path):
    monkeypatch.delenv('LLM_BASE_URL', raising=False)
    monkeypatch.delenv('LLM_API_KEY', raising=False)
    monkeypatch.delenv('LLM_MODEL', raising=False)
    monkeypatch.setenv('LLM_DISABLE_DOTENV', '1')
    monkeypatch.chdir(tmp_path)

    assert get_llm_client_from_env() is None


def test_get_llm_client_from_env_builds_openai_compatible_client(monkeypatch):
    monkeypatch.setenv('LLM_BASE_URL', 'https://api.vectorengine.ai')
    monkeypatch.setenv('LLM_API_KEY', 'test-key')
    monkeypatch.setenv('LLM_MODEL', 'gpt-5.4-mini')

    client = get_llm_client_from_env()

    assert isinstance(client, OpenAICompatibleLLMClient)
    assert client.base_url == 'https://api.vectorengine.ai/v1'
    assert client.model == 'gpt-5.4-mini'


def test_openai_compatible_client_normalizes_missing_v1_suffix():
    client = OpenAICompatibleLLMClient(
        base_url='https://api.vectorengine.ai',
        api_key='test-key',
        model='gpt-5.4-mini',
    )

    assert client.base_url == 'https://api.vectorengine.ai/v1'


def test_get_llm_client_from_env_loads_dotenv_without_overriding_existing_env(monkeypatch, tmp_path):
    monkeypatch.delenv('LLM_BASE_URL', raising=False)
    monkeypatch.delenv('LLM_API_KEY', raising=False)
    monkeypatch.delenv('LLM_MODEL', raising=False)
    monkeypatch.chdir(tmp_path)

    (tmp_path / '.env').write_text(
        'LLM_BASE_URL=https://api.vectorengine.ai\n'
        'LLM_API_KEY=file-key\n'
        'LLM_MODEL=gpt-5.4-mini\n',
        encoding='utf-8',
    )

    client = get_llm_client_from_env()

    assert isinstance(client, OpenAICompatibleLLMClient)
    assert client.api_key == 'file-key'

    monkeypatch.setenv('LLM_API_KEY', 'env-key')
    client = get_llm_client_from_env()
    assert client.api_key == 'env-key'
