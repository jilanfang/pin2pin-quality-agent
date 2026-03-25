from app.db.models import Base
from app.db.session import SessionLocal, engine
from app.repositories.cases import create_case
from app.repositories.stage_states import (
    confirm_stage_record,
    get_stage_record,
    initialize_stage_records,
    list_stage_records,
    mark_impacted_stages_after,
    save_working_stage_content,
    unlock_stage_record,
)


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_stage_state_repository_initializes_d1_to_d8_records():
    reset_db()
    with SessionLocal() as session:
        case = create_case(session, "Stage Repo Case", mode="mockup")
        initialize_stage_records(session, case.id)

        stages = list_stage_records(session, case.id)
        assert [stage.stage for stage in stages] == ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]


def test_stage_state_repository_tracks_lock_and_impact_status():
    reset_db()
    with SessionLocal() as session:
        case = create_case(session, "Stage Repo Case", mode="mockup")
        initialize_stage_records(session, case.id)

        save_working_stage_content(session, case.id, "D2", "working d2")
        save_working_stage_content(session, case.id, "D3", "confirmed d3")
        confirm_stage_record(session, case.id, "D3")
        unlock_stage_record(session, case.id, "D2")
        mark_impacted_stages_after(session, case.id, "D2", "新增证据可能影响后续阶段。")

        d2 = get_stage_record(session, case.id, "D2")
        d3 = get_stage_record(session, case.id, "D3")

        assert d2 is not None
        assert d3 is not None
        assert d2.working_content == "working d2"
        assert d2.locked == "false"
        assert d3.impacted == "true"
        assert "新增证据" in d3.impact_summary
