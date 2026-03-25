from fastapi.testclient import TestClient
from unittest.mock import patch

from app.db.models import Base
from app.db.session import engine
from app.main import app


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def create_case(client: TestClient, title: str = "Workflow Case", mode: str = "normal") -> dict:
    response = client.post("/cases", json={"title": title, "mode": mode})
    assert response.status_code == 200
    return response.json()


def test_post_evidence_persists_raw_input_and_updates_d2_working_state():
    reset_db()
    client = TestClient(app)
    case = create_case(client, mode="mockup")

    response = client.post(
        f"/cases/{case['id']}/evidence",
        json={"content": "客户反馈批次B12在2026-03-01发现黑屏异常，影响120台。"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_stage"] == "D2"
    assert payload["mode"] == "mockup"
    assert payload["d1_status"] == "missing"
    assert payload["draft_preview"]["draft"]["generation_meta"]["source"] == "fallback"
    d2 = next(stage for stage in payload["stages"] if stage["stage"] == "D2")
    assert "异常批次：B12" in d2["working_content"]
    assert d2["locked"] is False


def test_post_evidence_in_normal_mode_does_not_silently_fallback_to_ai_suggestion():
    reset_db()
    client = TestClient(app)
    case = create_case(client, mode="normal")

    with patch.dict(
        "os.environ",
        {"LLM_DISABLE_DOTENV": "1", "LLM_BASE_URL": "", "LLM_API_KEY": "", "LLM_MODEL": ""},
        clear=False,
    ):
        response = client.post(
            f"/cases/{case['id']}/evidence",
            json={"content": "客户反馈批次B12在2026-03-01发现黑屏异常，影响120台。"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "normal"
    assert "模型不可用" in " ".join(payload["warnings"])
    d2 = next(stage for stage in payload["stages"] if stage["stage"] == "D2")
    assert "请手工编辑" in d2["working_content"]


def test_draft_preview_and_report_are_blocked_before_d1_and_d8_are_complete():
    reset_db()
    client = TestClient(app)
    case = create_case(client, mode="mockup")

    client.post(
        f"/cases/{case['id']}/evidence",
        json={"content": "客户反馈批次B12在2026-03-01发现黑屏异常，影响120台。"},
    )

    preview = client.get(f"/cases/{case['id']}/draft-preview")
    assert preview.status_code == 200
    assert preview.json()["can_export"] is False
    assert "D1" in " ".join(preview.json()["warnings"])

    report = client.post(f"/cases/{case['id']}/report")
    assert report.status_code == 409


class FakeStageLLMClient:
    def __init__(self, content: str = "LLM staged content") -> None:
        self.content = content

    def generate_json(self, prompt: str) -> dict:
        if "当前目标阶段" in prompt:
            return {"content": self.content}
        return {
            "current_stage": "fact_completion",
            "known_facts": [],
            "missing_fields": [],
            "assumptions": [],
            "risk_flags": [],
            "next_question": None,
            "should_generate_draft": False,
        }


def test_normal_mode_report_remains_blocked_when_d1_missing_and_impacted_stage_exists():
    reset_db()
    client = TestClient(app)
    case = create_case(client, mode="normal")

    with patch("app.api.workflow.get_llm_client_from_env", return_value=FakeStageLLMClient()), patch(
        "app.services.stage_collaboration.get_llm_client_from_env",
        return_value=FakeStageLLMClient(),
    ):
        client.post(
            f"/cases/{case['id']}/evidence",
            json={"content": "客户反馈批次B12在2026-03-01发现黑屏异常，影响120台。"},
        )
        client.post(f"/cases/{case['id']}/stages/D2/confirm", json={})
        client.post(
            f"/cases/{case['id']}/evidence",
            json={"content": "已做隔离并暂停出货。", "context_stage": "D3"},
        )
        client.post(f"/cases/{case['id']}/stages/D3/confirm", json={})
        client.post(
            f"/cases/{case['id']}/evidence",
            json={"content": "补充证据：客户端现场是低温偶发。", "context_stage": "D2"},
        )

    preview = client.get(f"/cases/{case['id']}/draft-preview")
    report = client.post(f"/cases/{case['id']}/report")

    assert preview.status_code == 200
    assert preview.json()["can_export"] is False
    assert "D1" in " ".join(preview.json()["warnings"])
    assert "需复审" in " ".join(preview.json()["warnings"])
    assert report.status_code == 409
