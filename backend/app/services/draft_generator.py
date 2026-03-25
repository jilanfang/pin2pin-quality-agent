from app.core.schemas import (
    AssumptionItem,
    DraftResult,
    DraftSection,
    FactItem,
    GenerationMeta,
)
from app.services.llm_client import LLMClient, get_llm_client_from_env
from app.services.prompts import build_draft_generator_prompt


DRAFT_PROMPT_VERSION = "draft-generator-v2"
DRAFT_DOMAIN_PROFILE = "electronics_quality_engineer_v1"
DRAFT_REVIEW_MODE = "mvp_pre_expert_review"


DRAFT_GENERATOR_PROMPT_V1 = """你是 8D 报告生成器，负责输出可交付的初稿。

要求：
1. 生成 D1-D8
2. 对不确定内容明确标注“待验证”或“初步判断”
3. 不把临时遏制写成永久纠正措施
4. 不把假设写成已确认根因
"""


def _find_fact(known_facts: list[FactItem], field: str) -> str | None:
    for fact in known_facts:
        if fact.field == field:
            return fact.value
    return None


def _normalize_scenario(value: str | None) -> str:
    if value == "customer complaint":
        return "客户端投诉场景"
    return value or "待确认场景"


def _build_generation_meta(source: str) -> GenerationMeta:
    return GenerationMeta(
        source=source,
        prompt_version=DRAFT_PROMPT_VERSION,
        domain_profile=DRAFT_DOMAIN_PROFILE,
        review_mode=DRAFT_REVIEW_MODE,
    )


def generate_draft(
    case_id: int,
    known_facts: list[FactItem],
    assumptions: list[AssumptionItem],
    confirmed_stage_contents: dict[str, str] | None = None,
    llm_client: LLMClient | None = None,
) -> DraftResult:
    if confirmed_stage_contents:
        ordered_sections = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]
        sections = [
            DraftSection(
                section=section,
                content=confirmed_stage_contents.get(section, "" if section == "D1" else "待补充"),
                status="needs_validation" if section == "D1" else "confirmed",
            )
            for section in ordered_sections
        ]
        rendered_markdown = "\n\n".join(
            f"## {section.section}\n{section.content}" for section in sections
        )
        return DraftResult(
            case_id=str(case_id),
            version=1,
            sections=sections,
            rendered_markdown=rendered_markdown,
            generation_meta=_build_generation_meta("fallback"),
        )

    llm_client = llm_client or get_llm_client_from_env()
    if llm_client is not None:
        prompt = build_draft_generator_prompt(
            case_id=case_id,
            known_facts=known_facts,
            assumptions=assumptions,
        )
        try:
            payload = llm_client.generate_json(prompt)
            payload["generation_meta"] = _build_generation_meta("llm").model_dump()
            return DraftResult.model_validate(payload)
        except Exception:
            pass

    symptom = _find_fact(known_facts, "problem_symptom") or "待补充问题现象"
    batch = _find_fact(known_facts, "batch") or "待确认批次"
    discovery_time = _find_fact(known_facts, "discovery_time") or "待确认时间"
    scenario = _normalize_scenario(_find_fact(known_facts, "scenario"))
    impact = _find_fact(known_facts, "impact") or "待确认影响范围"

    sections = [
        DraftSection(
            section="D1",
            content="当前负责人待确认，建议补充质量、测试、工艺、研发及供应链相关角色，并明确主责人与升级路径。",
            status="needs_validation",
        ),
        DraftSection(
            section="D2",
            content=(
                f"当前已知异常现象：{symptom}。发现时间：{discovery_time}。场景：{scenario}。"
                f"批次：{batch}。影响范围：{impact}。"
                " 建议继续补充 Date Code / 工单 / 线别 / 工位 / 物料版本 / 固件版本待补充确认，"
                "并区分客户现象、内部复现现象与当前影响范围。"
            ),
            status="confirmed" if impact != "待确认影响范围" else "needs_validation",
        ),
        DraftSection(
            section="D3",
            content=(
                "当前临时遏制措施待补充，建议尽快确认是否已针对库存、在制品、已出货及客户端库存实施隔离、"
                "暂停出货、加严筛选或 100% 检验，并明确厂内与客户端遏制范围、责任人及状态。"
            ),
            status="needs_validation",
        ),
        DraftSection(
            section="D4",
            content=(
                "当前根因分析仍处于初步阶段，建议按“候选原因 -> 当前证据 -> 待验证项”结构展开，"
                "避免直接下最终根因结论。建议优先考虑复现试验、换料 / 换线 / 参数回看、"
                "AOI / X-Ray / 显微 / 电性能测试等电子制造常见验证路径。"
            ),
            status="assumed",
        ),
        DraftSection(
            section="D5",
            content="永久纠正措施需基于已确认根因制定；若根因尚未确认，请先保留为待确认，避免将临时遏制动作直接固化为永久措施。",
            status="needs_validation",
        ),
        DraftSection(
            section="D6",
            content="实施与验证方案待补充，建议明确验证方法、样本量、时间窗口、通过标准，以及措施已执行和措施已验证有效之间的区别。",
            status="needs_validation",
        ),
        DraftSection(
            section="D7",
            content="预防复发措施待补充，建议横向展开至相邻料号、共线机种、同供应商批次及相同制程窗口，并同步更新检查项、SOP、Control Plan 或培训要求。",
            status="needs_validation",
        ),
        DraftSection(
            section="D8",
            content="当前为初步 8D 草稿版本，结论仍以现场验证结果为准，建议在关键证据补齐后再形成正式结案总结与客户沟通版本。",
            status="assumed",
        ),
    ]

    if assumptions:
        sections[3].content += " 当前候选假设包括：" + "；".join(
            assumption.statement for assumption in assumptions
        )

    rendered_markdown = "\n\n".join(
        f"## {section.section}\n{section.content}" for section in sections
    )

    return DraftResult(
        case_id=str(case_id),
        version=1,
        sections=sections,
        rendered_markdown=rendered_markdown,
        generation_meta=_build_generation_meta("fallback"),
    )
