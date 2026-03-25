from app.core.schemas import AssumptionItem, DraftResult, FactItem
from app.services.draft_generator import generate_draft


def test_generate_draft_returns_d1_to_d8_sections():
    draft = generate_draft(case_id=1, known_facts=[], assumptions=[])
    sections = [section.section for section in draft.sections]
    assert sections == ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']
    assert draft.generation_meta.source == 'fallback'
    assert draft.generation_meta.domain_profile == 'electronics_quality_engineer_v1'
    assert 'Date Code' in draft.sections[1].content
    assert '在制品' in draft.sections[2].content
    assert 'AOI / X-Ray / 显微' in draft.sections[3].content
    assert '样本量' in draft.sections[5].content
    assert '相邻料号' in draft.sections[6].content


class FakeDraftLLMClient:
    def generate_json(self, prompt: str) -> dict:
        assert 'rendered_markdown' in prompt
        assert 'known_facts' in prompt
        return {
            'case_id': '42',
            'version': 1,
            'sections': [
                {'section': 'D1', 'content': '团队已初步建立。', 'status': 'needs_validation'},
                {'section': 'D2', 'content': '问题定义已整理。', 'status': 'confirmed'},
                {'section': 'D3', 'content': '遏制措施待验证。', 'status': 'needs_validation'},
                {'section': 'D4', 'content': '候选根因已列出。', 'status': 'assumed'},
                {'section': 'D5', 'content': '永久措施待确认。', 'status': 'needs_validation'},
                {'section': 'D6', 'content': '验证计划待补充。', 'status': 'needs_validation'},
                {'section': 'D7', 'content': '预防动作待展开。', 'status': 'needs_validation'},
                {'section': 'D8', 'content': '总结待最终确认。', 'status': 'assumed'},
            ],
            'rendered_markdown': '## D1\\n团队已初步建立。',
        }


def test_generate_draft_accepts_llm_client_and_parses_structured_result():
    draft = generate_draft(
        case_id=42,
        known_facts=[
            FactItem(field='problem_symptom', value='Voltage drop', confidence=0.9, source='user_input')
        ],
        assumptions=[AssumptionItem(statement='可能与焊点有关', needs_validation=True)],
        llm_client=FakeDraftLLMClient(),
    )

    assert isinstance(draft, DraftResult)
    assert draft.case_id == '42'
    assert draft.sections[1].section == 'D2'
    assert draft.sections[1].content == '问题定义已整理。'
    assert draft.generation_meta.source == 'llm'
    assert draft.generation_meta.prompt_version == 'draft-generator-v2'


def test_generate_draft_fallback_uses_electronics_quality_language_when_facts_exist():
    draft = generate_draft(
        case_id=9,
        known_facts=[
            FactItem(field='problem_symptom', value='客户端插电后偶发黑屏', confidence=0.9, source='user_input'),
            FactItem(field='batch', value='B12', confidence=0.9, source='user_input'),
            FactItem(field='discovery_time', value='March 1', confidence=0.8, source='user_input'),
            FactItem(field='scenario', value='customer complaint', confidence=0.8, source='user_input'),
            FactItem(field='impact', value='120 units', confidence=0.8, source='user_input'),
        ],
        assumptions=[AssumptionItem(statement='怀疑与电源板焊接稳定性有关', needs_validation=True)],
    )

    assert '批次：B12' in draft.sections[1].content
    assert 'Date Code / 工单 / 线别 / 工位 / 物料版本 / 固件版本待补充确认' in draft.sections[1].content
    assert '库存、在制品、已出货及客户端库存' in draft.sections[2].content
    assert '候选原因' in draft.sections[3].content
    assert '换料 / 换线 / 参数回看' in draft.sections[3].content
    assert '通过标准' in draft.sections[5].content
    assert '共线机种' in draft.sections[6].content


def test_generate_draft_aggregates_confirmed_stage_contents():
    draft = generate_draft(
        case_id=11,
        known_facts=[],
        assumptions=[],
        confirmed_stage_contents={
            'D1': '',
            'D2': '已确认的 D2',
            'D3': '已确认的 D3',
            'D4': '已确认的 D4',
            'D5': '已确认的 D5',
            'D6': '已确认的 D6',
            'D7': '已确认的 D7',
            'D8': '已确认的 D8',
        },
    )

    assert draft.sections[0].section == 'D1'
    assert draft.sections[0].content == ''
    assert draft.sections[1].content == '已确认的 D2'
    assert draft.sections[7].content == '已确认的 D8'
