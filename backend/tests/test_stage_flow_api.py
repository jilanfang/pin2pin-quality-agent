from fastapi.testclient import TestClient
from unittest.mock import patch

from app.db.models import Base
from app.db.session import engine
from app.main import app


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def create_case(client: TestClient, title: str = "Stage Flow Case", mode: str = "mockup") -> dict:
    response = client.post("/cases", json={"title": title, "mode": mode})
    assert response.status_code == 200
    return response.json()


def submit_evidence(client: TestClient, case_id: int, content: str, context_stage: str | None = None) -> dict:
    payload = {"content": content}
    if context_stage is not None:
        payload["context_stage"] = context_stage
    response = client.post(f"/cases/{case_id}/evidence", json=payload)
    assert response.status_code == 200
    return response.json()


def test_confirm_d2_advances_to_d3_and_locks_d2():
    reset_db()
    client = TestClient(app)
    case = create_case(client)

    submit_evidence(client, case["id"], "客户反馈黑屏异常，批次B12，影响120台。")

    response = client.post(f"/cases/{case['id']}/stages/D2/confirm", json={})
    payload = response.json()

    assert response.status_code == 200
    assert payload["current_stage"] == "D3"
    d2 = next(stage for stage in payload["stages"] if stage["stage"] == "D2")
    d3 = next(stage for stage in payload["stages"] if stage["stage"] == "D3")
    assert d2["locked"] is True
    assert d2["confirmed_content"]
    assert d3["locked"] is False
    assert d3["working_content"]


def test_new_evidence_marks_later_locked_stage_as_impacted():
    reset_db()
    client = TestClient(app)
    case = create_case(client)

    submit_evidence(client, case["id"], "客户反馈黑屏异常，批次B12，影响120台。")
    client.post(f"/cases/{case['id']}/stages/D2/confirm", json={})
    submit_evidence(client, case["id"], "已做隔离并暂停出货。")
    client.post(f"/cases/{case['id']}/stages/D3/confirm", json={})

    response = client.post(
        f"/cases/{case['id']}/evidence",
        json={"content": "补充证据：客户端现场并非全部黑屏，而是低温条件下偶发。", "context_stage": "D2"},
    )
    payload = response.json()

    assert response.status_code == 200
    d3 = next(stage for stage in payload["stages"] if stage["stage"] == "D3")
    assert d3["impacted"] is True
    assert "新增证据" in (d3["impact_summary"] or "")


def test_impacted_stage_blocks_further_confirmation_until_revalidated():
    reset_db()
    client = TestClient(app)
    case = create_case(client)

    submit_evidence(client, case["id"], "客户反馈黑屏异常，批次B12，影响120台。")
    client.post(f"/cases/{case['id']}/stages/D2/confirm", json={})
    submit_evidence(client, case["id"], "已做隔离并暂停出货。")
    client.post(f"/cases/{case['id']}/stages/D3/confirm", json={})
    client.post(
        f"/cases/{case['id']}/evidence",
        json={"content": "补充证据：客户端现场并非全部黑屏，而是低温条件下偶发。", "context_stage": "D2"},
    )

    blocked = client.post(f"/cases/{case['id']}/stages/D4/confirm", json={})
    assert blocked.status_code == 409

    revalidated = client.post(f"/cases/{case['id']}/stages/D3/revalidate", json={})
    payload = revalidated.json()
    assert revalidated.status_code == 200
    assert payload["current_stage"] == "D3"
    d3 = next(stage for stage in payload["stages"] if stage["stage"] == "D3")
    assert d3["locked"] is False
    assert d3["impacted"] is False


def test_unlocking_a_confirmed_stage_reopens_it_and_marks_later_stage_impacted():
    reset_db()
    client = TestClient(app)
    case = create_case(client)

    submit_evidence(client, case["id"], "客户反馈黑屏异常，批次B12，影响120台。")
    client.post(f"/cases/{case['id']}/stages/D2/confirm", json={})
    submit_evidence(client, case["id"], "已做隔离并暂停出货。")
    client.post(f"/cases/{case['id']}/stages/D3/confirm", json={})

    response = client.post(f"/cases/{case['id']}/stages/D2/unlock", json={})
    payload = response.json()

    assert response.status_code == 200
    assert payload["current_stage"] == "D2"
    d2 = next(stage for stage in payload["stages"] if stage["stage"] == "D2")
    d3 = next(stage for stage in payload["stages"] if stage["stage"] == "D3")
    assert d2["locked"] is False
    assert d3["impacted"] is True


class FakeStageLLMClient:
    def __init__(self, content: str) -> None:
        self.content = content

    def generate_json(self, prompt: str) -> dict:
        assert "当前目标阶段" in prompt
        return {"content": self.content}


def test_normal_mode_confirm_d2_prefills_d3_without_rereading_stage_states():
    reset_db()
    client = TestClient(app)
    case = create_case(client, mode="normal")

    with patch("app.api.workflow.get_llm_client_from_env", return_value=FakeStageLLMClient("D3 LLM suggestion")), patch(
        "app.services.stage_collaboration.get_llm_client_from_env",
        return_value=FakeStageLLMClient("D3 LLM suggestion"),
    ), patch(
        "app.services.stage_collaboration.list_stage_states",
        side_effect=AssertionError("stage states should come from workflow context"),
    ):
        submit_evidence(client, case["id"], "客户反馈黑屏异常，批次B12，影响120台。")
        response = client.post(f"/cases/{case['id']}/stages/D2/confirm", json={})

    payload = response.json()

    assert response.status_code == 200
    assert payload["current_stage"] == "D3"
    d3 = next(stage for stage in payload["stages"] if stage["stage"] == "D3")
    assert d3["working_content"] == "D3 LLM suggestion"
    assert "临时遏制措施建议" not in d3["working_content"]


def test_normal_mode_thin_d2_input_returns_d3_guidance_after_confirm():
    reset_db()
    client = TestClient(app)
    case = create_case(client, mode="normal")

    with patch("app.api.workflow.get_llm_client_from_env", return_value=FakeStageLLMClient("D3 LLM suggestion")), patch(
        "app.services.guided_thinking.get_llm_client_from_env",
        return_value=None,
    ):
        submit_evidence(client, case["id"], "客户反馈黑屏异常。")
        response = client.post(f"/cases/{case['id']}/stages/D2/confirm", json={})

    payload = response.json()

    assert response.status_code == 200
    assert payload["current_stage"] == "D3"
    assert any(item["field"] == "impact" for item in payload["missing_fields"])
    assert payload["guided_thinking"]["focus_area"] == "D3"
    assert "隔离" in payload["guided_thinking"]["guidance_text"]
