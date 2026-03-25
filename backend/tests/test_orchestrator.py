from app.core.schemas import GapItem
from app.services.orchestrator import decide_next_step


def test_orchestrator_returns_one_next_question_when_gaps_exist():
    result = decide_next_step(
        known_facts=[],
        missing_fields=[GapItem(field='batch', reason='missing', priority='high')],
        current_stage='fact_completion',
    )
    assert result.next_question is not None
    assert result.should_generate_draft is False


def test_orchestrator_force_advance_from_d2_enters_analysis_without_draft():
    result = decide_next_step(
        known_facts=[],
        missing_fields=[GapItem(field='impact', reason='missing', priority='high')],
        current_stage='fact_completion',
        force_advance=True,
    )
    assert result.current_stage == 'analysis'
    assert result.should_generate_draft is False
    assert result.next_question is None
    assert result.force_advanced is True


def test_orchestrator_force_advance_from_analysis_generates_draft():
    result = decide_next_step(
        known_facts=[],
        missing_fields=[],
        current_stage='analysis',
        force_advance=True,
    )
    assert result.current_stage == 'draft_ready'
    assert result.should_generate_draft is True
    assert result.force_advanced is True


def test_orchestrator_force_advance_from_draft_ready_moves_to_user_revision():
    result = decide_next_step(
        known_facts=[],
        missing_fields=[],
        current_stage='draft_ready',
        force_advance=True,
    )
    assert result.current_stage == 'user_revision'
    assert result.should_generate_draft is False
    assert result.force_advanced is True
