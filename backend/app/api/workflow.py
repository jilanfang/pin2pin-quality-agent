from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.schemas import (
    CaseWorkflowResponse,
    DraftPreviewResponse,
    FactItem,
    GapItem,
    GuidedThinkingResult,
    StageRecordResponse,
)
from app.db.models import Base, Case
from app.db.session import SessionLocal
from app.repositories.fact_snapshots import (
    create_fact_snapshot,
    get_latest_fact_snapshot,
    parse_assumptions,
    parse_known_facts,
    parse_missing_fields,
    parse_risk_flags,
)
from app.repositories.messages import create_message
from app.repositories.stage_states import (
    FLOW_STAGES,
    clear_stage_impact,
    confirm_stage_record,
    get_stage_record,
    initialize_stage_records,
    list_stage_records,
    mark_impacted_stages_after,
    save_working_stage_content,
    unlock_stage_record,
)
from app.services.draft_generator import generate_draft
from app.services.extractor import extract_case_state, recompute_case_state
from app.services.guided_thinking import build_guided_thinking
from app.services.llm_client import get_llm_client_from_env
from app.services.stage_collaboration import (
    build_confirmed_context_from_map,
    build_d2_content_from_facts,
    generate_stage_working_content_from_context,
    get_next_stage,
)

router = APIRouter()


class EvidenceCreateRequest(BaseModel):
    content: str
    source_type: str = "note"
    event_time: str | None = None
    context_stage: str | None = None


class StageActionRequest(BaseModel):
    content: str | None = None


def _merge_known_facts(existing: list[FactItem], incoming: list[FactItem]) -> list[FactItem]:
    merged: dict[str, FactItem] = {item.field: item for item in existing}
    for item in incoming:
        merged[item.field] = item
    return list(merged.values())


def _merge_text(existing: str, incoming: str) -> str:
    existing = existing.strip()
    incoming = incoming.strip()
    if not incoming:
        return existing
    if not existing:
        return incoming
    if incoming in existing:
        return existing
    return f"{existing}\n{incoming}"


def _fact_map(known_facts: list[FactItem]) -> dict[str, str]:
    return {item.field: item.value for item in known_facts}


def _normal_mode_placeholder(stage: str, known_facts: list[FactItem], content: str) -> str:
    if stage == "D2":
        facts = _fact_map(known_facts)
        observed = [
            f"异常现象：{facts.get('problem_symptom', '待手工整理')}",
            f"异常批次：{facts.get('batch', '待手工整理')}",
            f"首次发现时间：{facts.get('discovery_time', '待手工整理')}",
            f"影响范围：{facts.get('impact', '待手工整理')}",
        ]
        return "模型不可用，请手工编辑当前阶段。\n" + "\n".join(observed)
    manual_seed = content.strip() or "模型不可用，请手工编辑当前阶段。"
    return f"模型不可用，请手工编辑当前阶段。\n{manual_seed}".strip()


def _mockup_stage_fallback(stage: str, case_id: int, known_facts: list[FactItem], confirmed_context: dict[str, str]) -> str:
    if stage == "D1":
        return ""
    if stage == "D2":
        return build_d2_content_from_facts(known_facts)
    fallback_map = {
        "D3": "D3 临时遏制措施建议\n请基于已确认的 D2，补充隔离范围、库存处置、客户端遏制和关闭条件。",
        "D4": "D4 原因分析建议\n请基于已确认的 D2-D3，整理失效机理、候选原因、证据映射和待验证项。",
        "D5": "D5 永久措施建议\n请基于已确认的 D2-D4，整理永久纠正措施候选方案与适用边界。",
        "D6": "D6 验证实施建议\n请基于已确认的 D2-D5，整理实施计划、样本范围、验证方法和通过标准。",
        "D7": "D7 防止再发建议\n请基于已确认的 D2-D6，整理横向展开、流程更新、检查点和培训动作。",
        "D8": "D8 关闭案例建议\n请基于 D1-D7 的完成情况整理关闭建议，并检查是否具备结案条件。",
    }
    return fallback_map.get(stage, "")


def _generate_stage_working_content(case: Case, stage: str, known_facts: list[FactItem], content: str, confirmed_context: dict[str, str]) -> tuple[str, list[str]]:
    warnings: list[str] = []
    if case.mode == "mockup":
        return _mockup_stage_fallback(stage, case.id, known_facts, confirmed_context), warnings
    if stage == "D1":
        return content.strip(), warnings
    llm_client = get_llm_client_from_env()
    if llm_client is None:
        warnings.append("模型不可用，当前阶段已切换为手工编辑模式。")
        return _normal_mode_placeholder(stage, known_facts, content), warnings
    if stage == "D2":
        return build_d2_content_from_facts(known_facts), warnings
    return (
        generate_stage_working_content_from_context(
            stage=stage,
            confirmed_context=build_confirmed_context_from_map(confirmed_context),
            user_input=content,
            llm_client=llm_client,
        ),
        warnings,
    )


def _compute_d1_status(record) -> str:
    text = (record.confirmed_content or record.working_content or "").strip()
    if not text:
        return "missing"
    if record.locked == "true" and record.confirmed_content.strip():
        return "complete"
    return "partial"


def _build_preview(case: Case, stages: list[Any]) -> DraftPreviewResponse:
    confirmed_stage_contents: dict[str, str] = {}
    warnings: list[str] = []
    impacted_stages = [stage.stage for stage in stages if stage.impacted == "true"]
    unconfirmed_stages = [stage.stage for stage in stages if stage.stage != "D1" and stage.locked != "true"]

    for stage in stages:
        content = stage.confirmed_content if stage.locked == "true" and stage.confirmed_content else stage.working_content
        confirmed_stage_contents[stage.stage] = content or ""

    if case.d1_status != "complete":
        warnings.append("D1 未填写完成，正式完整报告暂不可导出。")
    if impacted_stages:
        warnings.append(f"以下阶段受新证据影响，需复审：{', '.join(impacted_stages)}。")
    if unconfirmed_stages:
        warnings.append(f"以下阶段尚未确认：{', '.join(unconfirmed_stages)}。")

    draft = generate_draft(
        case_id=case.id,
        known_facts=[],
        assumptions=[],
        confirmed_stage_contents=confirmed_stage_contents,
    )
    can_export = case.d1_status == "complete" and not impacted_stages and all(
        stage.locked == "true" for stage in stages if stage.stage != "D1"
    )
    return DraftPreviewResponse(
        draft=draft,
        warnings=warnings,
        can_export=can_export,
    )


def _serialize_stage(record) -> StageRecordResponse:
    return StageRecordResponse(
        stage=record.stage,
        working_content=record.working_content,
        confirmed_content=record.confirmed_content,
        locked=record.locked == "true",
        impacted=record.impacted == "true",
        impact_summary=record.impact_summary or None,
        last_reviewed_at=record.last_reviewed_at.isoformat() if record.last_reviewed_at else None,
    )


def _guidance_for_stage(stage: str, missing_fields: list[GapItem]) -> GuidedThinkingResult | None:
    if stage == "D1":
        return None
    if stage == "D4":
        return build_guided_thinking("analysis", missing_fields)
    if stage in FLOW_STAGES:
        return build_guided_thinking(stage, missing_fields)
    return None


def _build_case_response(session, case: Case, warnings: list[str] | None = None, missing_fields: list[GapItem] | None = None) -> CaseWorkflowResponse:
    persisted_case = session.get(Case, case.id)
    assert persisted_case is not None
    stages = list_stage_records(session, persisted_case.id)
    preview = _build_preview(persisted_case, stages)
    if missing_fields is None:
        latest_snapshot = get_latest_fact_snapshot(session, persisted_case.id)
        response_missing_fields = parse_missing_fields(latest_snapshot)
    else:
        response_missing_fields = missing_fields
    guided_thinking = _guidance_for_stage(persisted_case.current_stage, response_missing_fields)
    merged_warnings = list(
        dict.fromkeys(
            [
                *(warnings or []),
                *(guided_thinking.warnings if guided_thinking and response_missing_fields else []),
                *preview.warnings,
            ]
        )
    )
    return CaseWorkflowResponse(
        case_id=persisted_case.id,
        current_stage=persisted_case.current_stage,
        mode=persisted_case.mode,
        d1_status=persisted_case.d1_status,
        stages=[_serialize_stage(stage) for stage in stages],
        warnings=merged_warnings,
        missing_fields=response_missing_fields,
        guided_thinking=guided_thinking if response_missing_fields else None,
        draft_preview=preview,
    )


def _refresh_d1_status(session, case: Case) -> None:
    record = get_stage_record(session, case.id, "D1")
    assert record is not None
    case.d1_status = _compute_d1_status(record)
    session.add(case)
    session.commit()


@router.post("/cases/{case_id}/evidence", response_model=CaseWorkflowResponse)
def post_evidence(case_id: int, payload: EvidenceCreateRequest) -> CaseWorkflowResponse:
    with SessionLocal() as session:
        case = session.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found")

        initialize_stage_records(session, case.id)
        create_message(session, case_id=case.id, content=payload.content, message_type="evidence")

        latest_snapshot = get_latest_fact_snapshot(session, case.id)
        extracted = extract_case_state(payload.content)
        merged_known_facts = _merge_known_facts(parse_known_facts(latest_snapshot), extracted.known_facts)
        merged_assumptions = parse_assumptions(latest_snapshot)
        merged_risk_flags = list(dict.fromkeys([*parse_risk_flags(latest_snapshot), *extracted.risk_flags]))
        accumulated = recompute_case_state(
            known_facts=merged_known_facts,
            assumptions=merged_assumptions,
            risk_flags=merged_risk_flags,
        )
        create_fact_snapshot(
            session,
            case_id=case.id,
            known_facts=accumulated.known_facts,
            missing_fields=accumulated.missing_fields,
            assumptions=accumulated.assumptions,
            risk_flags=accumulated.risk_flags,
        )

        target_stage = payload.context_stage or case.current_stage
        stages = {record.stage: record for record in list_stage_records(session, case.id)}
        confirmed_context = {
            stage: record.confirmed_content
            for stage, record in stages.items()
            if record.locked == "true" and record.confirmed_content
        }

        warnings: list[str] = []
        if target_stage == "D1":
            d1_record = save_working_stage_content(session, case.id, "D1", _merge_text(stages["D1"].working_content, payload.content))
            case.d1_status = _compute_d1_status(d1_record)
            session.add(case)
            session.commit()
            return _build_case_response(session, case, warnings=warnings, missing_fields=accumulated.missing_fields)

        if target_stage not in FLOW_STAGES:
            target_stage = case.current_stage

        record = stages[target_stage]
        if record.locked != "true":
            generated, generation_warnings = _generate_stage_working_content(
                case,
                target_stage,
                accumulated.known_facts,
                payload.content,
                confirmed_context,
            )
            warnings.extend(generation_warnings)
            if case.mode == "normal" and get_llm_client_from_env() is None and target_stage != "D2":
                generated = _merge_text(record.working_content, payload.content or generated)
            save_working_stage_content(session, case.id, target_stage, generated)

        reason = f"新增证据可能影响 {target_stage} 之后阶段的结论，请复审。"
        mark_impacted_stages_after(session, case.id, target_stage, reason)
        _refresh_d1_status(session, case)
        return _build_case_response(session, case, warnings=warnings, missing_fields=accumulated.missing_fields)


@router.get("/cases/{case_id}/stages", response_model=CaseWorkflowResponse)
def get_stages(case_id: int) -> CaseWorkflowResponse:
    with SessionLocal() as session:
        case = session.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found")
        initialize_stage_records(session, case.id)
        return _build_case_response(session, case)


@router.post("/cases/{case_id}/stages/{stage}/confirm", response_model=CaseWorkflowResponse)
def confirm_stage(case_id: int, stage: str, payload: StageActionRequest) -> CaseWorkflowResponse:
    with SessionLocal() as session:
        case = session.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found")
        initialize_stage_records(session, case.id)
        impacted = [record.stage for record in list_stage_records(session, case.id) if record.impacted == "true"]
        if impacted:
            raise HTTPException(status_code=409, detail="Impacted stages require revalidation before further confirmation.")

        record = get_stage_record(session, case.id, stage)
        if record is None:
            raise HTTPException(status_code=404, detail="Stage not found")
        if payload.content:
            save_working_stage_content(session, case.id, stage, payload.content)
        confirm_stage_record(session, case.id, stage)
        if stage == "D1":
            case.d1_status = "complete"
        elif stage in FLOW_STAGES and stage != "D8":
            case.current_stage = get_next_stage(stage)
            next_record = get_stage_record(session, case.id, case.current_stage)
            latest_snapshot = get_latest_fact_snapshot(session, case.id)
            known_facts = parse_known_facts(latest_snapshot)
            confirmed_context = {
                item.stage: item.confirmed_content
                for item in list_stage_records(session, case.id)
                if item.locked == "true" and item.confirmed_content
            }
            if next_record and not next_record.working_content:
                generated, _warnings = _generate_stage_working_content(case, case.current_stage, known_facts, "", confirmed_context)
                save_working_stage_content(session, case.id, case.current_stage, generated)
        session.add(case)
        session.commit()
        _refresh_d1_status(session, case)
        return _build_case_response(session, case)


@router.post("/cases/{case_id}/stages/{stage}/unlock", response_model=CaseWorkflowResponse)
def unlock_stage(case_id: int, stage: str, payload: StageActionRequest) -> CaseWorkflowResponse:
    with SessionLocal() as session:
        case = session.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found")
        initialize_stage_records(session, case.id)
        record = unlock_stage_record(session, case.id, stage)
        if payload.content:
            save_working_stage_content(session, case.id, stage, payload.content)
        if stage != "D1":
            case.current_stage = stage
            mark_impacted_stages_after(session, case.id, stage, "上游阶段已解锁修改，后续阶段需复审。")
        session.add(case)
        session.commit()
        _refresh_d1_status(session, case)
        return _build_case_response(session, case)


@router.post("/cases/{case_id}/stages/{stage}/revalidate", response_model=CaseWorkflowResponse)
def revalidate_stage(case_id: int, stage: str, payload: StageActionRequest) -> CaseWorkflowResponse:
    with SessionLocal() as session:
        case = session.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found")
        initialize_stage_records(session, case.id)
        record = unlock_stage_record(session, case.id, stage)
        clear_stage_impact(session, case.id, stage)
        latest_snapshot = get_latest_fact_snapshot(session, case.id)
        known_facts = parse_known_facts(latest_snapshot)
        confirmed_context = {
            item.stage: item.confirmed_content
            for item in list_stage_records(session, case.id)
            if item.locked == "true" and item.confirmed_content and item.stage != stage
        }
        generated, warnings = _generate_stage_working_content(case, stage, known_facts, payload.content or record.working_content, confirmed_context)
        save_working_stage_content(session, case.id, stage, generated if not payload.content else payload.content)
        case.current_stage = stage if stage in FLOW_STAGES else case.current_stage
        session.add(case)
        session.commit()
        _refresh_d1_status(session, case)
        return _build_case_response(session, case, warnings=warnings)


@router.get("/cases/{case_id}/draft-preview", response_model=DraftPreviewResponse)
def get_draft_preview(case_id: int) -> DraftPreviewResponse:
    with SessionLocal() as session:
        case = session.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found")
        initialize_stage_records(session, case.id)
        return _build_preview(case, list_stage_records(session, case.id))


@router.post("/cases/{case_id}/report", response_model=DraftPreviewResponse)
def generate_report(case_id: int) -> DraftPreviewResponse:
    with SessionLocal() as session:
        case = session.get(Case, case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Case not found")
        initialize_stage_records(session, case.id)
        preview = _build_preview(case, list_stage_records(session, case.id))
        if not preview.can_export:
            raise HTTPException(status_code=409, detail="Case is not ready for formal report export.")
        case.status = "closed"
        session.add(case)
        session.commit()
        return preview
