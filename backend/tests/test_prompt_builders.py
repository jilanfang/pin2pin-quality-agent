from app.core.schemas import OrchestrationResult
from app.services.extractor import extract_case_state
from app.services.prompts import (
    build_draft_generator_prompt,
    build_extractor_prompt,
    build_stage_generation_prompt,
)


class FakeLLMClient:
    def generate_json(self, prompt: str) -> dict:
        assert 'known_facts' in prompt
        return {
            'current_stage': 'fact_completion',
            'known_facts': [
                {
                    'field': 'batch',
                    'value': 'B12',
                    'confidence': 0.99,
                    'source': 'llm',
                }
            ],
            'missing_fields': [],
            'assumptions': [],
            'risk_flags': [],
            'next_question': None,
            'should_generate_draft': True,
        }


def test_build_extractor_prompt_includes_json_contract():
    prompt = build_extractor_prompt('Customer reports intermittent failure on batch B12.')
    assert 'known_facts' in prompt
    assert 'missing_fields' in prompt
    assert '请只输出 JSON' in prompt


def test_extractor_accepts_llm_client_and_parses_structured_result():
    result = extract_case_state(
        'Customer reports intermittent failure on batch B12.',
        llm_client=FakeLLMClient(),
    )
    assert isinstance(result, OrchestrationResult)
    assert result.known_facts[0].field == 'batch'
    assert result.should_generate_draft is True


from app.core.schemas import GapItem
from app.services.orchestrator import decide_next_step
from app.services.prompts import build_orchestrator_prompt


class FakeOrchestratorLLMClient:
    def generate_json(self, prompt: str) -> dict:
        assert 'should_generate_draft' in prompt
        return {
            'current_stage': 'fact_completion',
            'known_facts': [],
            'missing_fields': [
                {'field': 'impact', 'reason': 'missing', 'priority': 'high'}
            ],
            'assumptions': [],
            'risk_flags': ['Impact scope is still unclear.'],
            'next_question': '这次异常影响了哪些客户、产品或数量范围？',
            'should_generate_draft': False,
        }


def test_build_orchestrator_prompt_includes_decision_fields():
    prompt = build_orchestrator_prompt(
        known_facts=[],
        missing_fields=[GapItem(field='impact', reason='missing', priority='high')],
    )
    assert 'current_stage' in prompt
    assert 'next_question' in prompt
    assert 'should_generate_draft' in prompt


def test_orchestrator_accepts_llm_client_and_parses_structured_result():
    result = decide_next_step(
        known_facts=[],
        missing_fields=[GapItem(field='impact', reason='missing', priority='high')],
        llm_client=FakeOrchestratorLLMClient(),
    )
    assert result.next_question == '这次异常影响了哪些客户、产品或数量范围？'
    assert result.should_generate_draft is False


from app.services.guided_thinking import build_guided_thinking
from app.services.prompts import build_guided_thinking_prompt


class FakeGuidedThinkingLLMClient:
    def generate_json(self, prompt: str) -> dict:
        assert 'focus_area' in prompt
        return {
            'focus_area': 'D4',
            'thinking_goal': 'Help the user separate candidate causes from confirmed root cause.',
            'guidance_text': '先列候选原因，再补证据，不要直接写最终根因。',
            'suggested_questions': ['每个候选原因目前有什么证据支持？'],
            'checkpoints': ['不要把假设写成已确认根因。'],
            'warnings': ['证据不足时应标注待验证。'],
        }


def test_build_guided_thinking_prompt_includes_focus_area_contract():
    prompt = build_guided_thinking_prompt(
        current_stage='analysis',
        missing_fields=[],
    )
    assert 'focus_area' in prompt
    assert 'thinking_goal' in prompt
    assert 'suggested_questions' in prompt
    assert '一次只推进一个关键思考动作' in prompt
    assert '发生根因' in prompt
    assert '逃逸根因' in prompt
    assert '不把临时止血动作误写成永久纠正' in prompt


def test_guided_thinking_accepts_llm_client_and_parses_structured_result():
    result = build_guided_thinking(
        current_stage='analysis',
        missing_fields=[],
        llm_client=FakeGuidedThinkingLLMClient(),
    )
    assert result is not None
    assert result.focus_area == 'D4'
    assert result.warnings[0] == '证据不足时应标注待验证。'


def test_build_draft_generator_prompt_includes_output_contract():
    prompt = build_draft_generator_prompt(
        case_id=7,
        known_facts=[],
        assumptions=[],
    )
    assert 'sections' in prompt
    assert 'rendered_markdown' in prompt
    assert '请只输出 JSON' in prompt
    assert '资深电子质量工程师' in prompt
    assert '批次 / Date Code / 工单 / 线别 / 站位' in prompt


def test_build_stage_generation_prompt_includes_stage_specific_constraints():
    prompt = build_stage_generation_prompt(
        stage='D3',
        confirmed_context='D2\n已确认问题描述',
        user_input='请补充客户端围堵动作',
    )
    assert '当前目标阶段' in prompt
    assert '只生成当前阶段的内容' in prompt
    assert '不要越级生成后续阶段' in prompt
    assert '"content"' in prompt
    assert 'D8 要基于 D2-D7 已确认内容输出结案建议' in prompt
