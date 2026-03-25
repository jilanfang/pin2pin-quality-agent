from app.core.schemas import AssumptionItem, FactItem, GapItem, OrchestrationResult
from app.services.llm_client import LLMClient, get_llm_client_from_env
from app.services.prompts import build_orchestrator_prompt


QUESTION_BY_FIELD = {
    "batch": "目前已收到异常现象。如果方便，可以继续补充批次信息；也可以继续描述现场表现、临时措施或验证观察。",
    "discovery_time": "目前已收到批次信息。如果方便，可以继续补充首次发现时间；也可以继续描述异常经过或现场判断。",
    "impact": "目前已收到异常现象、批次和时间。如果方便，可以继续补充影响范围；也可以继续补充客户反馈、库存影响或验证结果。",
    "validation_record": "目前事实已在累计中。如果方便，可以继续补充复现记录、测试结果或其他验证证据。",
}


def decide_next_step(
    known_facts: list[FactItem],
    missing_fields: list[GapItem],
    current_stage: str = "intake",
    assumptions: list[AssumptionItem] | None = None,
    risk_flags: list[str] | None = None,
    force_advance: bool = False,
    llm_client: LLMClient | None = None,
) -> OrchestrationResult:
    assumptions = assumptions or []
    risk_flags = risk_flags or []

    llm_client = llm_client or get_llm_client_from_env()
    if llm_client is not None:
        prompt = build_orchestrator_prompt(
            known_facts=known_facts,
            missing_fields=missing_fields,
            assumptions=assumptions,
            risk_flags=risk_flags,
        )
        try:
            payload = llm_client.generate_json(prompt)
            return OrchestrationResult.model_validate(payload)
        except Exception:
            pass

    if force_advance:
        if current_stage in {"intake", "fact_completion"}:
            return OrchestrationResult(
                current_stage="analysis",
                known_facts=known_facts,
                missing_fields=missing_fields,
                assumptions=assumptions,
                risk_flags=risk_flags,
                next_question=None,
                should_generate_draft=False,
                force_advanced=True,
            )
        if current_stage == "analysis":
            return OrchestrationResult(
                current_stage="draft_ready",
                known_facts=known_facts,
                missing_fields=missing_fields,
                assumptions=assumptions,
                risk_flags=risk_flags,
                next_question=None,
                should_generate_draft=True,
                force_advanced=True,
            )
        if current_stage == "draft_ready":
            return OrchestrationResult(
                current_stage="user_revision",
                known_facts=known_facts,
                missing_fields=missing_fields,
                assumptions=assumptions,
                risk_flags=risk_flags,
                next_question=None,
                should_generate_draft=False,
                force_advanced=True,
            )
        return OrchestrationResult(
            current_stage=current_stage,
            known_facts=known_facts,
            missing_fields=missing_fields,
            assumptions=assumptions,
            risk_flags=risk_flags,
            next_question=None,
            should_generate_draft=False,
            force_advanced=True,
        )

    high_priority_gaps = [gap for gap in missing_fields if gap.priority == "high"]

    if high_priority_gaps:
        top_gap = high_priority_gaps[0]
        next_question = QUESTION_BY_FIELD.get(
            top_gap.field,
            f"目前事实已在累计中。如果方便，可以继续补充与 {top_gap.field} 相关的信息，或继续提供你观察到的现象和判断。",
        )
        return OrchestrationResult(
            current_stage="fact_completion",
            known_facts=known_facts,
            missing_fields=missing_fields,
            assumptions=assumptions,
            risk_flags=risk_flags,
            next_question=next_question,
            should_generate_draft=False,
            force_advanced=False,
        )

    return OrchestrationResult(
        current_stage="analysis",
        known_facts=known_facts,
        missing_fields=missing_fields,
        assumptions=assumptions,
        risk_flags=risk_flags,
        next_question=None,
        should_generate_draft=True,
        force_advanced=False,
    )
