from app.core.schemas import GapItem, GuidedThinkingResult
from app.services.guided_thinking import build_guided_thinking


def test_guided_thinking_returns_d2_guidance_for_fact_completion():
    result = build_guided_thinking(
        current_stage='fact_completion',
        missing_fields=[GapItem(field='impact', reason='missing', priority='high')],
    )
    assert isinstance(result, GuidedThinkingResult)
    assert result.focus_area == 'D2'
    assert '请先不要急着解释原因' in result.guidance_text
    assert len(result.suggested_questions) >= 1
    assert any('批次' in question or '客户' in question for question in result.suggested_questions)
    assert any('现象' in checkpoint or '事实' in checkpoint for checkpoint in result.checkpoints)


def test_guided_thinking_returns_d4_guidance_for_analysis():
    result = build_guided_thinking(
        current_stage='analysis',
        missing_fields=[],
    )
    assert isinstance(result, GuidedThinkingResult)
    assert result.focus_area == 'D4'
    assert '机理' in result.guidance_text
    assert any('Is / Is Not' in question or '差异点' in question for question in result.suggested_questions)
    assert any('发生根因' in checkpoint or '逃逸根因' in checkpoint for checkpoint in result.checkpoints)
