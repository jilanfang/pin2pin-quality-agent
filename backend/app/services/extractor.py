import re

from app.core.schemas import AssumptionItem, FactItem, GapItem, OrchestrationResult
from app.services.llm_client import LLMClient, get_llm_client_from_env
from app.services.prompts import build_extractor_prompt


GAP_REASONS = {
    "batch": "缺少异常批次",
    "discovery_time": "缺少首次发现时间",
    "impact": "缺少影响范围",
}


def _append_fact(
    known_facts: list[FactItem],
    field: str,
    value: str | None,
    confidence: float = 0.85,
) -> None:
    cleaned = (value or "").strip().strip("，,。；;")
    if not cleaned:
        return
    if any(item.field == field for item in known_facts):
        return
    known_facts.append(
        FactItem(
            field=field,
            value=cleaned,
            confidence=confidence,
            source="user_input",
        )
    )


def _heuristic_extract_case_state(content: str) -> OrchestrationResult:
    normalized = content.strip()
    lowered = normalized.lower()

    known_facts: list[FactItem] = []
    missing_fields: list[GapItem] = []
    assumptions: list[AssumptionItem] = []
    risk_flags: list[str] = []

    if normalized:
        known_facts.append(
            FactItem(
                field="problem_symptom",
                value=normalized,
                confidence=0.7,
                source="user_input",
            )
        )

    batch_match = re.search(
        r"(?:\bbatch\s+|批次号?[:：]?\s*)([A-Za-z0-9_-]+)",
        normalized,
        flags=re.IGNORECASE,
    )
    if batch_match:
        known_facts.append(
            FactItem(
                field="batch",
                value=batch_match.group(1),
                confidence=0.95,
                source="user_input",
            )
        )
    else:
        missing_fields.append(
            GapItem(field="batch", reason=GAP_REASONS["batch"], priority="high")
        )

    date_match = (
        re.search(
            r"\b(?:on|at)\s+([A-Z][a-z]+\s+\d{1,2})\b",
            normalized,
            flags=re.IGNORECASE,
        )
        or re.search(r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})", normalized)
        or re.search(r"(\d{1,2}月\d{1,2}日)", normalized)
    )
    if date_match:
        known_facts.append(
            FactItem(
                field="discovery_time",
                value=date_match.group(1),
                confidence=0.85,
                source="user_input",
            )
        )
    else:
        missing_fields.append(
            GapItem(
                field="discovery_time",
                reason=GAP_REASONS["discovery_time"],
                priority="high",
            )
        )

    if "customer" in lowered or "客户" in normalized:
        known_facts.append(
            FactItem(
                field="scenario",
                value="customer complaint",
                confidence=0.8,
                source="user_input",
            )
        )
    else:
        assumptions.append(
            AssumptionItem(
                statement="Issue may not yet be tied to an external customer complaint."
            )
        )

    impact_match = re.search(
        r"\bimpact(?:ing|ed)?\s+([^.,;]+)",
        normalized,
        flags=re.IGNORECASE,
    ) or re.search(r"影响[:：]?\s*([^，。,；;]+)", normalized)
    if impact_match:
        _append_fact(known_facts, "impact", impact_match.group(1), confidence=0.85)

    customer_match = re.search(
        r"客户\s*([A-Za-z0-9][A-Za-z0-9_-]*?)(?=项目|机种|型号|Lot|Date\s*Code|线别|工单|[，,。；;\s])",
        normalized,
        flags=re.IGNORECASE,
    )
    _append_fact(known_facts, "customer", customer_match.group(1) if customer_match else None, confidence=0.9)

    project_match = re.search(
        r"项目\s*([A-Za-z0-9][A-Za-z0-9_-]*?)(?=机种|型号|Lot|Date\s*Code|线别|工单|[，,。；;\s])",
        normalized,
        flags=re.IGNORECASE,
    )
    _append_fact(known_facts, "project", project_match.group(1) if project_match else None, confidence=0.88)

    model_match = re.search(
        r"(?:机种|型号)\s*([A-Za-z0-9][A-Za-z0-9_-]*)",
        normalized,
        flags=re.IGNORECASE,
    )
    _append_fact(known_facts, "model", model_match.group(1) if model_match else None, confidence=0.88)

    lot_match = re.search(
        r"\bLot[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)",
        normalized,
        flags=re.IGNORECASE,
    ) or re.search(r"批号[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)", normalized)
    _append_fact(known_facts, "lot", lot_match.group(1) if lot_match else None, confidence=0.9)

    date_code_match = re.search(
        r"(?:Date\s*Code|DateCode|DC)[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)",
        normalized,
        flags=re.IGNORECASE,
    )
    _append_fact(known_facts, "date_code", date_code_match.group(1) if date_code_match else None, confidence=0.9)

    line_match = re.search(
        r"线别[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)",
        normalized,
        flags=re.IGNORECASE,
    )
    _append_fact(known_facts, "line", line_match.group(1) if line_match else None, confidence=0.85)

    station_match = re.search(r"([A-Za-z0-9][A-Za-z0-9_-]{1,})站", normalized)
    _append_fact(known_facts, "station", station_match.group(1) if station_match else None, confidence=0.82)

    work_order_match = re.search(
        r"(?:工单|WO|Work\s*Order)[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)",
        normalized,
        flags=re.IGNORECASE,
    )
    _append_fact(known_facts, "work_order", work_order_match.group(1) if work_order_match else None, confidence=0.9)

    containment_match = re.search(
        r"(已[^。]*?(?:隔离|暂停出货|封锁|拦截)[^。]*?)(?=，并完成|,并完成|。|$)",
        normalized,
    )
    _append_fact(
        known_facts,
        "containment_action",
        containment_match.group(1) if containment_match else None,
        confidence=0.8,
    )

    validation_match = re.search(
        r"(完成[^。]*?(?:验证|复测|确认)[^。]*?)(?=。|$)",
        normalized,
    )
    _append_fact(
        known_facts,
        "validation_record",
        validation_match.group(1) if validation_match else None,
        confidence=0.8,
    )

    if not any(fact.field == "impact" for fact in known_facts):
        missing_fields.append(
            GapItem(
                field="impact",
                reason=GAP_REASONS["impact"],
                priority="high",
            )
        )

    if "intermittent" in lowered:
        risk_flags.append("Intermittent issue may require stronger reproduction evidence.")

    return OrchestrationResult(
        current_stage="fact_completion",
        known_facts=known_facts,
        missing_fields=missing_fields,
        assumptions=assumptions,
        risk_flags=risk_flags,
        next_question=None,
        should_generate_draft=False,
        force_advanced=False,
    )


def recompute_case_state(
    known_facts: list[FactItem],
    assumptions: list[AssumptionItem] | None = None,
    risk_flags: list[str] | None = None,
) -> OrchestrationResult:
    assumptions = assumptions or []
    risk_flags = risk_flags or []

    fact_by_field = {fact.field: fact for fact in known_facts}
    missing_fields: list[GapItem] = []

    if "batch" not in fact_by_field:
        missing_fields.append(
            GapItem(field="batch", reason=GAP_REASONS["batch"], priority="high")
        )
    if "discovery_time" not in fact_by_field:
        missing_fields.append(
            GapItem(
                field="discovery_time",
                reason=GAP_REASONS["discovery_time"],
                priority="high",
            )
        )
    if "impact" not in fact_by_field:
        missing_fields.append(
            GapItem(
                field="impact",
                reason=GAP_REASONS["impact"],
                priority="high",
            )
        )

    next_assumptions = list(assumptions)
    if "scenario" not in fact_by_field:
        scenario_assumption = AssumptionItem(
            statement="Issue may not yet be tied to an external customer complaint."
        )
        if not any(item.statement == scenario_assumption.statement for item in next_assumptions):
            next_assumptions.append(scenario_assumption)

    unique_risk_flags = list(dict.fromkeys(risk_flags))

    return OrchestrationResult(
        current_stage="fact_completion",
        known_facts=known_facts,
        missing_fields=missing_fields,
        assumptions=next_assumptions,
        risk_flags=unique_risk_flags,
        next_question=None,
        should_generate_draft=False,
        force_advanced=False,
    )


def extract_case_state(
    content: str,
    llm_client: LLMClient | None = None,
) -> OrchestrationResult:
    llm_client = llm_client or get_llm_client_from_env()
    if llm_client is not None:
        prompt = build_extractor_prompt(content)
        try:
            payload = llm_client.generate_json(prompt)
            return OrchestrationResult.model_validate(payload)
        except Exception:
            pass

    return _heuristic_extract_case_state(content)
