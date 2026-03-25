from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.schemas import (
    AssumptionItem,
    DraftResult,
    FactItem,
    GapItem,
    GenerationMeta,
    GuidedThinkingResult,
)
from app.db.models import Case
from app.db.session import SessionLocal
from app.repositories.fact_snapshots import (
    create_fact_snapshot,
    get_latest_fact_snapshot,
    parse_assumptions,
    parse_known_facts,
    parse_risk_flags,
)
from app.repositories.messages import create_message
from app.repositories.stage_states import get_stage_state, upsert_stage_state
from app.services.draft_generator import generate_draft
from app.services.extractor import extract_case_state, recompute_case_state
from app.services.guided_thinking import build_guided_thinking
from app.services.orchestrator import decide_next_step
from app.services.stage_collaboration import (
    build_d2_content_from_facts,
    generate_stage_working_content,
    get_next_stage,
)

router = APIRouter()
ADVANCE_COMMANDS = {
    '进入下一步',
    '先继续',
    '继续',
    '先往下走',
    '先出初稿',
}


class MessageCreateRequest(BaseModel):
    content: str
    force_advance: bool = False
    confirm: bool = False


class MessageIntakeResponse(BaseModel):
    case_id: int
    current_stage: str
    confirmed: bool = False
    working_stage_content: str | None = None
    confirmed_stage_content: str | None = None
    known_facts: list[FactItem]
    missing_fields: list[GapItem]
    assumptions: list[AssumptionItem]
    risk_flags: list[str]
    guided_thinking: GuidedThinkingResult | None = None
    next_question: str | None = None
    should_generate_draft: bool = False
    force_advanced: bool = False
    draft: DraftResult | None = None
    generation_meta: GenerationMeta | None = None


def _normalize_content_for_extraction(content: str, force_advance: bool) -> str:
    normalized = content.strip()
    if force_advance and normalized in ADVANCE_COMMANDS:
        return ""
    return normalized


def _merge_known_facts(existing: list[FactItem], incoming: list[FactItem]) -> list[FactItem]:
    merged: dict[str, FactItem] = {item.field: item for item in existing}
    for item in incoming:
        merged[item.field] = item
    return list(merged.values())


def _merge_assumptions(existing: list[AssumptionItem], incoming: list[AssumptionItem]) -> list[AssumptionItem]:
    merged = {item.statement: item for item in existing}
    for item in incoming:
        merged[item.statement] = item
    return list(merged.values())


@router.post("/cases/{case_id}/messages", response_model=MessageIntakeResponse)
def create_message_endpoint(case_id: int, payload: MessageCreateRequest) -> MessageIntakeResponse:
    with SessionLocal() as session:
        case = session.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found")

        create_message(session, case_id=case.id, content=payload.content)
        current_stage = case.current_stage or "D2"

        if current_stage.startswith("D"):
            latest_snapshot = get_latest_fact_snapshot(session, case.id)
            existing_known_facts = parse_known_facts(latest_snapshot)
            existing_assumptions = parse_assumptions(latest_snapshot)
            existing_risk_flags = parse_risk_flags(latest_snapshot)

            if payload.confirm:
                working_state = get_stage_state(session, case.id, current_stage, confirmed=False)
                confirmed_content = working_state.content if working_state else generate_stage_working_content(
                    session,
                    case.id,
                    current_stage,
                    payload.content,
                )
                upsert_stage_state(
                    session,
                    case_id=case.id,
                    stage=current_stage,
                    content=confirmed_content,
                    confirmed=True,
                )
                if current_stage == "D8":
                    from app.repositories.stage_states import list_stage_states

                    confirmed_states = {
                        state.stage: state.content
                        for state in list_stage_states(session, case.id, confirmed=True)
                    }
                    draft = generate_draft(
                        case.id,
                        [],
                        [],
                        confirmed_stage_contents={
                            "D1": "",
                            **confirmed_states,
                        },
                    )
                    return MessageIntakeResponse(
                        case_id=case.id,
                        current_stage="D8",
                        confirmed=True,
                        working_stage_content=confirmed_content,
                        confirmed_stage_content=confirmed_content,
                        known_facts=[],
                        missing_fields=[],
                        assumptions=[],
                        risk_flags=[],
                        guided_thinking=None,
                        next_question=None,
                        should_generate_draft=True,
                        force_advanced=False,
                        draft=draft,
                        generation_meta=draft.generation_meta,
                    )
                next_stage = get_next_stage(current_stage)
                next_working_content = generate_stage_working_content(session, case.id, next_stage, "")
                upsert_stage_state(
                    session,
                    case_id=case.id,
                    stage=next_stage,
                    content=next_working_content,
                    confirmed=False,
                )
                case.current_stage = next_stage
                session.add(case)
                session.commit()
                return MessageIntakeResponse(
                    case_id=case.id,
                    current_stage=next_stage,
                    confirmed=True,
                    working_stage_content=next_working_content,
                    confirmed_stage_content=confirmed_content,
                    known_facts=[],
                    missing_fields=[],
                    assumptions=[],
                    risk_flags=[],
                    guided_thinking=None,
                    next_question=None,
                    should_generate_draft=next_stage == "D8",
                    force_advanced=False,
                    draft=generate_draft(case.id, [], []) if next_stage == "D8" else None,
                    generation_meta=None,
                )

            if current_stage == "D2":
                case_state = extract_case_state(payload.content) if payload.content.strip() else recompute_case_state(
                    known_facts=[],
                    assumptions=[],
                    risk_flags=[],
                )
                merged_known_facts = _merge_known_facts(existing_known_facts, case_state.known_facts)
                merged_assumptions = _merge_assumptions(existing_assumptions, case_state.assumptions)
                merged_risk_flags = list(dict.fromkeys([*existing_risk_flags, *case_state.risk_flags]))
                accumulated_state = recompute_case_state(
                    known_facts=merged_known_facts,
                    assumptions=merged_assumptions,
                    risk_flags=merged_risk_flags,
                )
                create_fact_snapshot(
                    session,
                    case_id=case.id,
                    known_facts=accumulated_state.known_facts,
                    missing_fields=accumulated_state.missing_fields,
                    assumptions=accumulated_state.assumptions,
                    risk_flags=accumulated_state.risk_flags,
                )
                working_content = build_d2_content_from_facts(accumulated_state.known_facts)
                upsert_stage_state(
                    session,
                    case_id=case.id,
                    stage=current_stage,
                    content=working_content,
                    confirmed=False,
                )
                orchestration = decide_next_step(
                    known_facts=accumulated_state.known_facts,
                    missing_fields=accumulated_state.missing_fields,
                    current_stage='fact_completion',
                    assumptions=accumulated_state.assumptions,
                    risk_flags=accumulated_state.risk_flags,
                )
                return MessageIntakeResponse(
                    case_id=case.id,
                    current_stage=current_stage,
                    confirmed=False,
                    working_stage_content=working_content,
                    confirmed_stage_content=None,
                    known_facts=accumulated_state.known_facts,
                    missing_fields=accumulated_state.missing_fields,
                    assumptions=accumulated_state.assumptions,
                    risk_flags=accumulated_state.risk_flags,
                    guided_thinking=build_guided_thinking(
                        current_stage='fact_completion',
                        missing_fields=accumulated_state.missing_fields,
                    ),
                    next_question=orchestration.next_question,
                    should_generate_draft=False,
                    force_advanced=False,
                    draft=None,
                    generation_meta=None,
                )

            working_content = generate_stage_working_content(session, case.id, current_stage, payload.content)
            upsert_stage_state(
                session,
                case_id=case.id,
                stage=current_stage,
                content=working_content,
                confirmed=False,
            )
            return MessageIntakeResponse(
                case_id=case.id,
                current_stage=current_stage,
                confirmed=False,
                working_stage_content=working_content,
                confirmed_stage_content=None,
                known_facts=[],
                missing_fields=[],
                assumptions=[],
                risk_flags=[],
                guided_thinking=build_guided_thinking(
                    current_stage="fact_completion" if current_stage == "D2" else "analysis" if current_stage == "D4" else current_stage,
                    missing_fields=[],
                ),
                next_question=None,
                should_generate_draft=False,
                force_advanced=False,
                draft=None,
                generation_meta=None,
            )
        latest_snapshot = get_latest_fact_snapshot(session, case.id)
        existing_known_facts = parse_known_facts(latest_snapshot)
        existing_assumptions = parse_assumptions(latest_snapshot)
        existing_risk_flags = parse_risk_flags(latest_snapshot)

        content_for_extraction = _normalize_content_for_extraction(
            payload.content,
            payload.force_advance,
        )
        case_state = extract_case_state(content_for_extraction) if content_for_extraction else recompute_case_state(
            known_facts=[],
            assumptions=[],
            risk_flags=[],
        )
        merged_known_facts = _merge_known_facts(existing_known_facts, case_state.known_facts)
        merged_assumptions = _merge_assumptions(existing_assumptions, case_state.assumptions)
        merged_risk_flags = list(dict.fromkeys([*existing_risk_flags, *case_state.risk_flags]))
        accumulated_state = recompute_case_state(
            known_facts=merged_known_facts,
            assumptions=merged_assumptions,
            risk_flags=merged_risk_flags,
        )
        orchestration = decide_next_step(
            known_facts=accumulated_state.known_facts,
            missing_fields=accumulated_state.missing_fields,
            current_stage=case.current_stage,
            assumptions=accumulated_state.assumptions,
            risk_flags=accumulated_state.risk_flags,
            force_advance=payload.force_advance,
        )
        guided_thinking = build_guided_thinking(
            current_stage=orchestration.current_stage,
            missing_fields=orchestration.missing_fields,
        )
        draft = None
        if orchestration.should_generate_draft:
            draft = generate_draft(
                case_id=case.id,
                known_facts=orchestration.known_facts,
                assumptions=orchestration.assumptions,
            )

        create_fact_snapshot(
            session,
            case_id=case.id,
            known_facts=orchestration.known_facts,
            missing_fields=orchestration.missing_fields,
            assumptions=orchestration.assumptions,
            risk_flags=orchestration.risk_flags,
        )
        case.current_stage = orchestration.current_stage
        session.add(case)
        session.commit()

        return MessageIntakeResponse(
            case_id=case.id,
            current_stage=orchestration.current_stage,
            known_facts=orchestration.known_facts,
            missing_fields=orchestration.missing_fields,
            assumptions=orchestration.assumptions,
            risk_flags=orchestration.risk_flags,
            guided_thinking=guided_thinking,
            next_question=orchestration.next_question,
            should_generate_draft=orchestration.should_generate_draft,
            force_advanced=orchestration.force_advanced,
            draft=draft,
            generation_meta=draft.generation_meta if draft else None,
        )
