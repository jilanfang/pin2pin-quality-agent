from app.core.schemas import AssumptionItem, FactItem, GapItem


def _format_known_facts(known_facts: list[FactItem] | None) -> str:
    if not known_facts:
        return "[]"
    lines = [
        f'- {fact.field}: {fact.value} (source={fact.source or "unknown"}, confidence={fact.confidence})'
        for fact in known_facts
    ]
    return "\n".join(lines)


def build_extractor_prompt(
    content: str,
    known_facts: list[FactItem] | None = None,
) -> str:
    return f"""你是 8D 案件摘要器，不是最终判定专家。

你的任务：
1. 从用户输入中提取已知事实
2. 找出影响交付质量的关键信息缺口
3. 标出推断/假设，不能当成事实
4. 标出风险提示

要求：
- 优先保留原始事实
- 不混淆“客户描述”和“内部判断”
- 不补造不存在的信息
- 如果信息不足，也要尽量整理出当前已知内容
- 如果输入里出现制造现场字段，尽量单独保留，不要并到自由文本里
- 重点识别：customer / project / model / batch / lot / date_code / line / station / work_order / containment_action / validation_record
- 输出必须是严格 JSON

历史已知事实：
{_format_known_facts(known_facts)}

当前用户输入：
{content}

输出字段：
- current_stage
- known_facts: [{{"field": "", "value": "", "confidence": 0.0, "source": ""}}]
- missing_fields: [{{"field": "", "reason": "", "priority": "high|medium|low"}}]
- assumptions: [{{"statement": "", "needs_validation": true}}]
- risk_flags: [""]
- next_question
- should_generate_draft

请只输出 JSON，不要输出解释。"""


def _format_missing_fields(missing_fields: list[GapItem] | None) -> str:
    if not missing_fields:
        return "[]"
    return "\n".join(
        f'- {gap.field}: {gap.reason} (priority={gap.priority})' for gap in missing_fields
    )


def _format_assumptions(assumptions: list[AssumptionItem] | None) -> str:
    if not assumptions:
        return "[]"
    return "\n".join(
        f'- {assumption.statement} (needs_validation={assumption.needs_validation})'
        for assumption in assumptions
    )


def build_orchestrator_prompt(
    known_facts: list[FactItem],
    missing_fields: list[GapItem],
    assumptions: list[AssumptionItem] | None = None,
    risk_flags: list[str] | None = None,
) -> str:
    risk_flags_text = "[]"
    if risk_flags:
        risk_flags_text = "\n".join(f"- {flag}" for flag in risk_flags)

    return f"""你是 8D 案件推进助手。

你的任务：
1. 判断案件当前阶段
2. 选择一个最关键的下一问
3. 决定是否允许进入出稿

规则：
- 先补事实，再做分析
- 一次只推进一个关键问题
- 如果高优先级缺口还在，should_generate_draft = false
- 如果可以出稿，也要保留待验证风险

已知事实（known_facts）：
{_format_known_facts(known_facts)}

缺失字段：
{_format_missing_fields(missing_fields)}

当前假设：
{_format_assumptions(assumptions)}

风险提示：
{risk_flags_text}

输出字段：
- current_stage
- known_facts
- missing_fields
- assumptions
- risk_flags
- next_question
- should_generate_draft

请只输出 JSON，不要输出解释。"""


def build_guided_thinking_prompt(
    current_stage: str,
    missing_fields: list[GapItem],
) -> str:
    return f"""你是 8D 思考引导教练，不是直接代答的写手。

你的任务：
1. 根据当前案件阶段，判断应该引导用户思考哪一块
2. 给出清晰、专业、循序渐进的思考引导
3. 帮用户区分事实、判断、措施、验证
4. 发现空泛、跳步、证据不足时及时提醒

当前阶段：
{current_stage}

当前缺失字段：
{_format_missing_fields(missing_fields)}

重点覆盖：
- D2 问题定义
- D3 临时遏制
- D4 根因分析
- D5 永久纠正措施
- D6 实施与验证
- D7 预防复发

要求：
- 一次只推进一个关键思考动作
- 不要一次抛出太多问题
- 问题要具体、可回答、贴近工程现场
- 如果信息不足，优先引导补事实或补证据
- 不把假设写成结论
- 不把临时止血动作误写成永久纠正

D2 提示要点：
- 先定义现象，再讨论原因
- 优先确认故障现象、客户/批次/工序/场景、工况、运行时长、故障频率、影响范围
- 明确哪些是事实，哪些是判断

D3 提示要点：
- 临时遏制必须覆盖在制、库存、出货、客户端或失效现场中的相关范围
- 要区分“已采取动作”“待执行动作”“关闭条件”
- 如果只是写了“已隔离”或“已处理”，要继续追问隔离边界、责任人、时点和验证方式

D4 提示要点：
- 先做 Is / Is Not，识别差异点
- 先确认失效机理，再展开候选原因
- 发生根因与逃逸根因必须分开分析
- 每条候选原因都要给证据状态
- 正向复现 + 反向消除都通过，才能写成根因结论

D5-D7 提示要点：
- D5 只讨论针对已确认根因的永久纠正措施
- D6 区分“已实施”和“已验证有效”
- D7 关注横向展开、流程更新、培训和系统预防

输出字段：
- focus_area
- thinking_goal
- guidance_text
- suggested_questions
- checkpoints
- warnings

请只输出 JSON，不要输出解释。"""


def build_draft_generator_prompt(
    case_id: int,
    known_facts: list[FactItem],
    assumptions: list[AssumptionItem] | None = None,
) -> str:
    return f"""你是资深电子质量工程师视角的 8D 报告初稿生成器，熟悉消费电子、工业电子、PCBA 与整机制造质量场景。

任务：
1. 基于当前已知事实生成 D1-D8 初稿
2. 信息不足时明确写“待补充”“待验证”或“初步判断”
3. 不把临时遏制写成永久纠正措施
4. 不把假设写成已确认根因
5. 输出风格要像资深质量工程师，而不是泛泛文书助手

案件编号：
{case_id}

已知事实（known_facts）：
{_format_known_facts(known_facts)}

当前假设：
{_format_assumptions(assumptions)}

输出字段：
- case_id
- version
- sections: [{{"section": "D1", "content": "", "status": "confirmed|assumed|needs_validation"}}]
- rendered_markdown

要求：
- sections 必须包含 D1 到 D8，顺序不能错
- rendered_markdown 要和 sections 对应
- 语言要专业、克制、适合后续继续编辑
- 优先关注电子工程现场常见关键信息：批次 / Date Code / 工单 / 线别 / 站位 / 物料版本 / 固件版本 / 测试工站 / 客诉与出货影响范围
- D2 要区分客户现象、内部复现现象、受影响范围
- D3 要体现临时遏制覆盖在制、库存、出货、客户端等范围
- D4 要区分候选原因、失效机理、验证证据、待验证项
- D5-D6 要体现措施与根因闭环、验证样本、通过标准
- D7 要考虑横向展开到相邻料号、共线机种、同供应商批次或相同制程窗口

请只输出 JSON，不要输出解释。"""


def build_stage_generation_prompt(
    stage: str,
    confirmed_context: str,
    user_input: str = "",
) -> str:
    stage_specific_guidance = {
        "D3": "输出临时遏制措施、隔离范围、客户端保护动作和关闭条件。信息不足时保留待确认点，不要越级分析根因。",
        "D4": "输出候选原因、失效机理、证据映射和待验证项。不要把候选原因直接写成已确认根因。",
        "D5": "输出针对已确认根因的永久纠正措施建议，并注明适用边界与前置假设。",
        "D6": "输出实施计划、验证方法、样本范围、判定标准，并区分已实施与待验证。",
        "D7": "输出横向展开、流程更新、培训和系统预防动作，避免重复 D5/D6 内容。",
        "D8": "输出结案建议、未决风险、经验沉淀和关闭条件检查。",
    }.get(stage, "只输出当前阶段可供用户确认或修订的建议稿。")

    return f"""你是 8D 阶段协作助手。

当前目标阶段：
{stage}

已确认的前序阶段内容：
{confirmed_context}

用户对当前阶段的补充：
{user_input or "暂无"}

要求：
- 只生成当前阶段的内容，不要越级生成后续阶段
- 严格依赖已确认的前序阶段信息
- 输出要适合用户继续修正和确认
- D1 保持空白，不要生成
- D8 要基于 D2-D7 已确认内容输出结案建议
- 当前阶段专属要求：{stage_specific_guidance}

请只输出 JSON：
{{
  "content": "当前阶段建议内容"
}}"""
