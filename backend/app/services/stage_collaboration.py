from app.repositories.stage_states import list_stage_states
from app.core.schemas import FactItem
from app.services.extractor import extract_case_state
from app.services.llm_client import LLMClient, get_llm_client_from_env
from app.services.prompts import build_stage_generation_prompt


STAGE_SEQUENCE = ["D2", "D3", "D4", "D5", "D6", "D7", "D8"]


def get_next_stage(current_stage: str) -> str:
    if current_stage not in STAGE_SEQUENCE:
        return "D2"
    index = STAGE_SEQUENCE.index(current_stage)
    if index == len(STAGE_SEQUENCE) - 1:
        return "D8"
    return STAGE_SEQUENCE[index + 1]


def build_d2_working_content(user_input: str) -> str:
    case_state = extract_case_state(user_input)
    return build_d2_content_from_facts(case_state.known_facts)


def build_d2_content_from_facts(known_facts: list[FactItem]) -> str:
    fact_map = {item.field: item.value for item in known_facts}
    lines = [
        "D2 问题定义",
        f"异常现象：{fact_map.get('problem_symptom', '待补充')}",
        f"异常批次：{fact_map.get('batch', '待补充')}",
        f"首次发现时间：{fact_map.get('discovery_time', '待补充')}",
        f"影响范围：{fact_map.get('impact', '待补充')}",
    ]
    return "\n".join(lines)


def build_confirmed_context(session, case_id: int) -> str:
    states = list_stage_states(session, case_id, confirmed=True)
    if not states:
        return "暂无已确认阶段内容。"
    return "\n\n".join(f"{state.stage}\n{state.content}" for state in states)


def build_confirmed_context_from_map(confirmed_context: dict[str, str]) -> str:
    if not confirmed_context:
        return "暂无已确认阶段内容。"
    ordered_stages = ["D1", *STAGE_SEQUENCE]
    blocks = [
        f"{stage}\n{confirmed_context[stage]}"
        for stage in ordered_stages
        if confirmed_context.get(stage)
    ]
    if not blocks:
        return "暂无已确认阶段内容。"
    return "\n\n".join(blocks)


def _fallback_stage_content(stage: str) -> str:
    fallback_map = {
        "D3": "请基于已确认的 D2，整理临时遏制措施建议、隔离范围、客户响应和关闭条件。",
        "D4": "请基于已确认的 D2-D3，整理失效机理、候选原因、发生根因、逃逸根因和证据映射。",
        "D5": "请基于已确认的 D2-D4，整理针对已确认根因的永久纠正措施建议。",
        "D6": "请基于已确认的 D2-D5，整理实施计划、验证方法、样本范围和通过标准。",
        "D7": "请基于已确认的 D2-D6，整理横向展开、流程更新、培训和系统预防建议。",
        "D8": "请基于已确认的 D2-D7，整理结案总结、经验沉淀和客户沟通建议。",
    }
    return fallback_map.get(stage, "")


def generate_stage_working_content_from_context(
    stage: str,
    confirmed_context: str,
    user_input: str = "",
    llm_client: LLMClient | None = None,
) -> str:
    if stage == "D2":
        return build_d2_working_content(user_input)

    llm_client = llm_client or get_llm_client_from_env()
    if llm_client is not None:
        try:
            payload = llm_client.generate_json(
                build_stage_generation_prompt(
                    stage=stage,
                    confirmed_context=confirmed_context,
                    user_input=user_input,
                )
            )
            if isinstance(payload, dict) and payload.get("content"):
                return str(payload["content"])
        except Exception:
            pass

    return _fallback_stage_content(stage)


def generate_stage_working_content(session, case_id: int, stage: str, user_input: str = "") -> str:
    confirmed_context = build_confirmed_context(session, case_id)
    return generate_stage_working_content_from_context(stage, confirmed_context, user_input)
