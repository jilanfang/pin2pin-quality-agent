from app.core.schemas import GapItem, GuidedThinkingResult
from app.services.llm_client import LLMClient, get_llm_client_from_env
from app.services.prompts import build_guided_thinking_prompt


def build_guided_thinking(
    current_stage: str,
    missing_fields: list[GapItem],
    llm_client: LLMClient | None = None,
) -> GuidedThinkingResult | None:
    llm_client = llm_client or get_llm_client_from_env()
    if llm_client is not None:
        prompt = build_guided_thinking_prompt(
            current_stage=current_stage,
            missing_fields=missing_fields,
        )
        try:
            payload = llm_client.generate_json(prompt)
            return GuidedThinkingResult.model_validate(payload)
        except Exception:
            pass

    if current_stage in {"D2", "fact_completion"}:
        return GuidedThinkingResult(
            focus_area="D2",
            thinking_goal="帮助用户先把问题现象定义清楚，并把事实、判断、范围和场景拆开。",
            guidance_text=(
                "请先不要急着解释原因，先把问题现象定义清楚，并把事实和判断拆开。"
            ),
            suggested_questions=[
                "故障现象到底是什么，能否用现场可观察到的物理特征描述？",
                "这次问题涉及哪个客户、哪个批次、哪类产品或哪个位置？",
            ],
            checkpoints=[
                "先写看到的现象，不先写原因判断。",
                "把发现时间、批次、工况、频率和影响范围拆清楚。",
            ],
            warnings=[
                "如果一句话里同时包含现象和推断，请先拆开。",
            ],
        )

    if current_stage == "D3":
        return GuidedThinkingResult(
            focus_area="D3",
            thinking_goal="帮助用户把临时遏制措施写成可执行的风险控制动作，而不是一句泛化描述。",
            guidance_text="请把隔离边界、库存和在制处置、出货控制、客户端保护动作以及关闭条件拆开写清楚。",
            suggested_questions=[
                "当前哪些库存、在制、已出货和客户端现场已被纳入遏制范围，哪些还没有？",
                "临时遏制由谁执行、何时完成、用什么检查点确认已真正拦住风险？",
            ],
            checkpoints=[
                "D3 先控制风险，不提前写永久对策或根因结论。",
                "如果只写了已隔离，要继续补充隔离范围、时点、责任人和关闭条件。",
            ],
            warnings=[
                "当前信息不足以确认 D3，请补充遏制范围、对象、责任人与关闭条件。",
            ],
        )

    if current_stage in {"D4", "analysis"}:
        return GuidedThinkingResult(
            focus_area="D4",
            thinking_goal="帮助用户先确认失效机理，再区分发生根因与逃逸根因，避免直接下结论。",
            guidance_text="请先确认 Is / Is Not 和失效机理，再区分发生根因与逃逸根因，最后补证据映射和验证计划。",
            suggested_questions=[
                "Is / Is Not 矩阵里，哪些条件下发生、哪些相似条件下没有发生，差异点是什么？",
                "当前缺陷更像哪种失效机理，需要用 X-Ray、切片、SEM 还是其他手段先确认？",
            ],
            checkpoints=[
                "发生根因与逃逸根因必须分开分析。",
                "没有证据的只能标记为候选原因，不能直接写成根因结论。",
            ],
            warnings=[
                "机理未确认前，不要跳到原因层结论；证据不足时应明确标注待验证。",
            ],
        )

    if current_stage == "D5":
        return GuidedThinkingResult(
            focus_area="D5",
            thinking_goal="帮助用户把永久纠正措施绑定到已确认根因，而不是罗列泛化动作。",
            guidance_text="请逐条说明措施对应哪条已确认根因，适用边界是什么，为什么能真正消除问题。",
            suggested_questions=[
                "每一条永久措施对应哪条已确认根因，如何证明它不是临时止血？",
                "措施落地后哪些风险仍然存在，哪些前置条件尚未满足？",
            ],
            checkpoints=[
                "没有根因闭环的动作不能写成 D5 永久措施。",
                "要写明措施边界、责任团队和失效模式覆盖范围。",
            ],
            warnings=[
                "如果根因或措施边界仍不清楚，D5 不应直接确认。",
            ],
        )

    if current_stage == "D6":
        return GuidedThinkingResult(
            focus_area="D6",
            thinking_goal="帮助用户区分措施已实施和措施已验证有效，避免把执行当成验证结论。",
            guidance_text="请补充实施状态、验证样本、判定标准、时间窗口以及通过或未通过的证据。",
            suggested_questions=[
                "措施是已实施、部分实施还是待实施？分别由谁负责、何时完成？",
                "验证用了多少样本、覆盖哪些工况、通过标准是什么？",
            ],
            checkpoints=[
                "已执行不等于已验证有效。",
                "验证需要样本范围、方法和判定标准，不能只有口头结论。",
            ],
            warnings=[
                "当前信息不足以确认 D6，请补充实施状态与验证证据。",
            ],
        )

    if current_stage == "D7":
        return GuidedThinkingResult(
            focus_area="D7",
            thinking_goal="帮助用户把经验固化成系统预防动作，而不是只完成当前个案纠偏。",
            guidance_text="请补充横向展开范围、流程或文件更新、培训对象、监控检查点以及防呆机制。",
            suggested_questions=[
                "相邻料号、共线机种、同供应商批次或相同制程窗口是否也需要横向排查？",
                "哪些流程、SOP、培训或系统检查点需要更新，谁负责关闭？",
            ],
            checkpoints=[
                "D7 关注系统预防与横向展开，不重复 D5/D6 的执行细节。",
                "要写明覆盖对象、更新载体和关闭确认方式。",
            ],
            warnings=[
                "若尚未说明横向展开和系统更新，D7 仍然不完整。",
            ],
        )

    return None
