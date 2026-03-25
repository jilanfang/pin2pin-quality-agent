from datetime import datetime, UTC
from types import SimpleNamespace

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import CaseStage


ALL_STAGES = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]
FLOW_STAGES = ["D2", "D3", "D4", "D5", "D6", "D7", "D8"]


def initialize_stage_records(session: Session, case_id: int) -> list[CaseStage]:
    existing = list_stage_records(session, case_id)
    if existing:
        return existing
    for stage in ALL_STAGES:
        session.add(CaseStage(case_id=case_id, stage=stage))
    session.commit()
    return list_stage_records(session, case_id)


def list_stage_records(session: Session, case_id: int) -> list[CaseStage]:
    records = list(session.scalars(select(CaseStage).where(CaseStage.case_id == case_id).order_by(CaseStage.id.asc())))
    if records:
        return records
    return []


def get_stage_record(session: Session, case_id: int, stage: str) -> CaseStage | None:
    return session.scalar(
        select(CaseStage)
        .where(CaseStage.case_id == case_id, CaseStage.stage == stage)
        .limit(1)
    )


def _as_flag(value: bool) -> str:
    return "true" if value else "false"


def save_working_stage_content(session: Session, case_id: int, stage: str, content: str) -> CaseStage:
    record = get_stage_record(session, case_id, stage)
    if record is None:
        initialize_stage_records(session, case_id)
        record = get_stage_record(session, case_id, stage)
    assert record is not None
    record.working_content = content
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def confirm_stage_record(session: Session, case_id: int, stage: str) -> CaseStage:
    record = get_stage_record(session, case_id, stage)
    assert record is not None
    record.confirmed_content = record.working_content
    record.locked = "true"
    record.impacted = "false"
    record.impact_summary = ""
    record.last_reviewed_at = datetime.now(UTC)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def unlock_stage_record(session: Session, case_id: int, stage: str) -> CaseStage:
    record = get_stage_record(session, case_id, stage)
    assert record is not None
    record.locked = "false"
    record.impacted = "false"
    record.impact_summary = ""
    if record.confirmed_content and not record.working_content:
        record.working_content = record.confirmed_content
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def clear_stage_impact(session: Session, case_id: int, stage: str) -> CaseStage:
    record = get_stage_record(session, case_id, stage)
    assert record is not None
    record.impacted = "false"
    record.impact_summary = ""
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def mark_impacted_stages_after(session: Session, case_id: int, stage: str, reason: str) -> list[CaseStage]:
    if stage not in FLOW_STAGES:
        impacted = FLOW_STAGES
    else:
        impacted = FLOW_STAGES[FLOW_STAGES.index(stage) + 1 :]
    updated: list[CaseStage] = []
    for impacted_stage in impacted:
        record = get_stage_record(session, case_id, impacted_stage)
        if record is None or record.locked != "true":
            continue
        record.impacted = "true"
        record.impact_summary = reason
        session.add(record)
        updated.append(record)
    session.commit()
    for record in updated:
        session.refresh(record)
    return updated


def get_stage_state(session: Session, case_id: int, stage: str, confirmed: bool):
    record = get_stage_record(session, case_id, stage)
    if record is None:
        return None
    content = record.confirmed_content if confirmed else record.working_content
    if not content:
        return None
    return SimpleNamespace(
        case_id=case_id,
        stage=stage,
        confirmed='true' if confirmed else 'false',
        content=content,
    )


def list_stage_states(session: Session, case_id: int, confirmed: bool | None = None):
    records = list_stage_records(session, case_id)
    items = []
    for record in records:
        if confirmed is True and not record.confirmed_content:
            continue
        if confirmed is False and not record.working_content:
            continue
        items.append(
            SimpleNamespace(
                case_id=case_id,
                stage=record.stage,
                confirmed='true' if confirmed else 'false' if confirmed is not None else record.locked,
                content=record.confirmed_content if confirmed else record.working_content if confirmed is not None else (record.confirmed_content or record.working_content),
            )
        )
    return items


def upsert_stage_state(session: Session, case_id: int, stage: str, content: str, confirmed: bool):
    if get_stage_record(session, case_id, stage) is None:
        initialize_stage_records(session, case_id)
    if confirmed:
        record = save_working_stage_content(session, case_id, stage, content)
        return confirm_stage_record(session, case_id, record.stage)
    return save_working_stage_content(session, case_id, stage, content)
