import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.schemas import AssumptionItem, FactItem, GapItem
from app.db.models import FactSnapshot


def get_latest_fact_snapshot(session: Session, case_id: int) -> FactSnapshot | None:
    return session.scalar(
        select(FactSnapshot)
        .where(FactSnapshot.case_id == case_id)
        .order_by(FactSnapshot.id.desc())
        .limit(1)
    )


def create_fact_snapshot(
    session: Session,
    case_id: int,
    known_facts: list[FactItem],
    missing_fields: list[GapItem],
    assumptions: list[AssumptionItem],
    risk_flags: list[str],
) -> FactSnapshot:
    snapshot = FactSnapshot(
        case_id=case_id,
        facts_json=json.dumps([item.model_dump() for item in known_facts], ensure_ascii=False),
        gaps_json=json.dumps([item.model_dump() for item in missing_fields], ensure_ascii=False),
        assumptions_json=json.dumps([item.model_dump() for item in assumptions], ensure_ascii=False),
        risk_flags_json=json.dumps(risk_flags, ensure_ascii=False),
    )
    session.add(snapshot)
    session.commit()
    session.refresh(snapshot)
    return snapshot


def parse_known_facts(snapshot: FactSnapshot | None) -> list[FactItem]:
    if snapshot is None:
        return []
    return [FactItem.model_validate(item) for item in json.loads(snapshot.facts_json)]


def parse_missing_fields(snapshot: FactSnapshot | None) -> list[GapItem]:
    if snapshot is None:
        return []
    return [GapItem.model_validate(item) for item in json.loads(snapshot.gaps_json)]


def parse_assumptions(snapshot: FactSnapshot | None) -> list[AssumptionItem]:
    if snapshot is None:
        return []
    return [AssumptionItem.model_validate(item) for item in json.loads(snapshot.assumptions_json)]


def parse_risk_flags(snapshot: FactSnapshot | None) -> list[str]:
    if snapshot is None:
        return []
    return list(json.loads(snapshot.risk_flags_json))
