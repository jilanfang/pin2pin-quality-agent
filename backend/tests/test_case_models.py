from app.db.models import Case, Message, FactSnapshot, Draft, StageState


def test_models_define_core_entities():
    assert Case.__tablename__ == 'cases'
    assert Message.__tablename__ == 'messages'
    assert FactSnapshot.__tablename__ == 'fact_snapshots'
    assert Draft.__tablename__ == 'drafts'
    assert StageState.__tablename__ == 'stage_states'
