import {
  applyEvidence,
  buildCaseWorkflowView,
  confirmStage,
  createCaseAggregate,
  revalidateStage,
  unlockStage,
} from "@/lib/domain/workflow-engine";

describe("workflowEngine", () => {
  it("switches to urgent complaint mode and asks only for failure location plus containment scope first", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技今天早上产线停线，MCU-800 连续 3 片上电爆板冒烟并有火花，要求立即停止发货，并在24小时内给出初步分析和围堵措施。",
      contextStage: "D2",
    });

    const assistantMessage = aggregate.messages.at(-1)?.content ?? "";

    expect(aggregate.knownFacts.find((item) => item.field === "mode")?.value).toBe(
      "customer_complaint_urgent"
    );
    expect(aggregate.knownFacts.find((item) => item.field === "severity")?.value).toBe("high");
    expect(assistantMessage).toContain("高优先级异常响应");
    expect(assistantMessage).toContain("先把现场止血");
    expect(assistantMessage).toContain("为什么先问这个");
    expect(assistantMessage).toContain("你只需要补");
    expect(assistantMessage).toContain("失效位置");
    expect(assistantMessage).not.toContain("客户现场/已发货/库存/在制品");
    expect(assistantMessage).not.toContain("根因已确认");
    expect(aggregate.missingFields.map((item) => item.field)).toEqual(
      expect.arrayContaining(["failure_location", "containment_status", "batch_trace"])
    );
    expect(buildCaseWorkflowView(aggregate).guidedThinking?.suggestedQuestions?.[0] ?? "").toBe(
      "先确认失效位置或失效部位，先不要抢跑根因。"
    );
  });

  it("moves to containment questioning only after failure location is clarified in urgent complaints", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技今天早上产线停线，MCU-800 连续 3 片上电爆板冒烟并有火花，要求立即停止发货，并在24小时内给出初步分析和围堵措施。",
      contextStage: "D2",
    });

    aggregate = applyEvidence(aggregate, {
      content: "失效位置在电源输入端 C25 钽电容。",
      contextStage: "D2",
    });

    const assistantMessage = aggregate.messages.at(-1)?.content ?? "";

    expect(buildCaseWorkflowView(aggregate).guidedThinking?.suggestedQuestions?.[0] ?? "").toBe(
      "客户现场、已发货、成品库存、在制品目前各自怎么处理，哪一块还没控住、责任人是谁、预计何时关窗？"
    );
    expect(assistantMessage).toContain("客户现场、已发货、成品库存、在制品目前各自怎么处理，哪一块还没控住、责任人是谁、预计何时关窗");
    expect(assistantMessage).not.toContain("工单、批次、线别");
  });

  it("auto-advances urgent complaints to D3 once D2 facts are complete enough to start containment review", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户现场发现上电冒烟，批次B22，今天早班出现3台，已暂停出货。",
      contextStage: "D2",
    });

    aggregate = applyEvidence(aggregate, {
      content: "失效位置在输入端钽电容C25附近，厂内库存已冻结，在制品暂停投线。",
      contextStage: "D2",
    });

    const guided = buildCaseWorkflowView(aggregate).guidedThinking;
    const assistantMessage = aggregate.messages.at(-1)?.content ?? "";

    expect(aggregate.caseRecord.currentStage).toBe("D3");
    expect(aggregate.stages.D3.workingContent).toContain("D3 临时遏制措施工作稿");
    expect(guided?.focusArea).toBe("D3");
    expect(guided?.suggestedQuestions).toEqual([
      "客户现场、已发货、成品库存、在制品目前各自怎么处理，哪一块还没控住、责任人是谁、预计何时关窗？",
    ]);
    expect(assistantMessage).toContain("客户现场、已发货、成品库存、在制品目前各自怎么处理");
  });

  it("moves normal cases forward once D2 has enough boundary information", () => {
    let aggregate = createCaseAggregate("普通异常");

    aggregate = applyEvidence(aggregate, {
      content: "客户反馈黑屏异常，批次B12，影响120台。",
      contextStage: "D2",
    });

    const guided = buildCaseWorkflowView(aggregate).guidedThinking;

    expect(aggregate.caseRecord.currentStage).toBe("D3");
    expect(aggregate.stages.D3.workingContent).toContain("D3 临时遏制措施建议");
    expect(guided?.focusArea).toBe("D3");
    expect(guided?.suggestedQuestions).toEqual(["客户端、在制品、库存和已出货各自如何处理？"]);
  });

  it("prioritizes impact clarification over scenario classification when fragmented D2 evidence already exposes a failure point", () => {
    let aggregate = createCaseAggregate("碎片异常");

    aggregate = applyEvidence(aggregate, {
      content: "样品在 C25 位号附近有发黑和击穿痕迹，但还不知道一共波及多少台。",
      contextStage: "D2",
    });

    const guided = buildCaseWorkflowView(aggregate).guidedThinking;

    expect(guided?.suggestedQuestions).toEqual(["这次异常当前影响了哪些批次、数量、客户或产线，先把影响范围钉住。"]);
  });

  it("prioritizes traceability clarification once fragmented D2 evidence already has failure point and impact", () => {
    let aggregate = createCaseAggregate("碎片异常");

    aggregate = applyEvidence(aggregate, {
      content: "C25 位号击穿，客户端已发现 12 台异常，产线还在排查。",
      contextStage: "D2",
    });

    const guided = buildCaseWorkflowView(aggregate).guidedThinking;

    expect(guided?.suggestedQuestions).toEqual([
      "先回一句你现在最确定的一条追溯信息：批次、发现时间、线别或工单，先给一个也能继续往下走。",
    ]);
  });

  it("keeps only one highest-value next question in normal D3 guidance", () => {
    let aggregate = createCaseAggregate("普通异常");

    aggregate = applyEvidence(aggregate, {
      content: "客户反馈黑屏异常，批次B12，影响120台，已暂停出货。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });

    const guided = buildCaseWorkflowView(aggregate).guidedThinking;

    expect(guided?.suggestedQuestions).toEqual(["客户端、在制品、库存和已出货各自如何处理？"]);
  });

  it("confirms D2, advances to D3, and prebuilds D3 working content", () => {
    let aggregate = createCaseAggregate("客诉案例");

    aggregate = applyEvidence(aggregate, {
      content: "客户反馈黑屏异常，批次B12，影响120台，已暂停出货。",
      contextStage: "D2",
    });

    aggregate = confirmStage(aggregate, { stage: "D2" });

    expect(aggregate.caseRecord.currentStage).toBe("D3");
    expect(aggregate.stages.D2.locked).toBe(true);
    expect(aggregate.stages.D2.confirmedContent).not.toBe("");
    expect(aggregate.stages.D3.locked).toBe(false);
    expect(aggregate.stages.D3.workingContent).toContain("临时遏制");
  });

  it("marks later locked stages as impacted when upstream evidence changes", () => {
    let aggregate = createCaseAggregate("客诉案例");

    aggregate = applyEvidence(aggregate, {
      content: "客户反馈黑屏异常，批次B12，影响120台，已暂停出货。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "已冻结库存并安排客户端隔离。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });

    aggregate = applyEvidence(aggregate, {
      content: "补充证据：并非全部黑屏，而是低温条件下偶发。",
      contextStage: "D2",
    });

    expect(aggregate.stages.D3.impacted).toBe(true);
    expect(aggregate.stages.D3.impactSummary).toContain("新增证据");
  });

  it("blocks further confirmation until impacted stages are revalidated", () => {
    let aggregate = createCaseAggregate("客诉案例");

    aggregate = applyEvidence(aggregate, {
      content: "客户反馈黑屏异常，批次B12，影响120台，已暂停出货。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "已冻结库存并安排客户端隔离。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "补充证据：并非全部黑屏，而是低温条件下偶发。",
      contextStage: "D2",
    });

    expect(() => confirmStage(aggregate, { stage: "D4" })).toThrow(
      "Impacted stages require revalidation before further confirmation."
    );

    aggregate = revalidateStage(aggregate, { stage: "D3" });

    expect(aggregate.caseRecord.currentStage).toBe("D3");
    expect(aggregate.stages.D3.locked).toBe(false);
    expect(aggregate.stages.D3.impacted).toBe(false);
  });

  it("unlocking an upstream stage reopens it and marks downstream stages impacted", () => {
    let aggregate = createCaseAggregate("客诉案例");

    aggregate = applyEvidence(aggregate, {
      content: "客户反馈黑屏异常，批次B12，影响120台，已暂停出货。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "已冻结库存并安排客户端隔离。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });

    aggregate = unlockStage(aggregate, { stage: "D2" });

    expect(aggregate.caseRecord.currentStage).toBe("D2");
    expect(aggregate.stages.D2.locked).toBe(false);
    expect(aggregate.stages.D3.impacted).toBe(true);
  });

  it("marks D3 and D4 for review when new evidence overturns a prior customer complaint judgement", () => {
    let aggregate = createCaseAggregate("客诉案例");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 冒烟，位号C25处异常，批次B12，2026-03-21发现，客户产线停线，已暂停出货。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货与库存同步冻结，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "初步怀疑为替代料导入后的贴装方向异常，需同时检查发生原因和流出原因。",
      contextStage: "D4",
    });
    aggregate = confirmStage(aggregate, { stage: "D4" });

    aggregate = applyEvidence(aggregate, {
      content: "补充证据：客户复盘后确认并非爆板，而是连接器处瞬间打火，前序失效部位判断需要复审。",
      contextStage: "D2",
    });

    const assistantMessage = aggregate.messages.at(-1)?.content ?? "";

    expect(aggregate.stages.D3.impacted).toBe(true);
    expect(aggregate.stages.D4.impacted).toBe(true);
    expect(aggregate.stages.D3.impactSummary).toContain("失效位置已从 C25 调整为 连接器处");
    expect(aggregate.stages.D3.impactSummary).toContain("原先围堵边界和原因链判断需要重算");
    expect(assistantMessage).toContain("失效位置已从 C25 调整为 连接器处");
    expect(assistantMessage).toContain("原先围堵边界和原因链判断需要重算");
    expect(assistantMessage).toContain("建议回看 D3 / D4");
  });

  it("builds D3 around four containment objects for urgent complaints", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技今天早上产线停线，MCU-800 连续 3 片上电爆板冒烟并有火花，要求立即停止发货，并在24小时内给出初步分析和围堵措施。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });

    expect(aggregate.stages.D3.workingContent).toContain("客户现场");
    expect(aggregate.stages.D3.workingContent).toContain("已发货");
    expect(aggregate.stages.D3.workingContent).toContain("成品库存");
    expect(aggregate.stages.D3.workingContent).toContain("在制品");
    expect(aggregate.stages.D3.workingContent).toContain("责任人");
    expect(aggregate.stages.D3.workingContent).toContain("关闭条件");
  });

  it("auto-advances urgent complaints from D3 to D4 once containment scope is complete", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，位号C25处异常，批次B12，2026-03-21发现，客户产线停线，已暂停出货。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });

    aggregate = applyEvidence(aggregate, {
      content: "客户现场已封存待检，已发货已冻结追查，成品库存已扣留，在制品暂停投线。",
      contextStage: "D3",
    });

    const guided = buildCaseWorkflowView(aggregate).guidedThinking;
    const assistantMessage = aggregate.messages.at(-1)?.content ?? "";

    expect(aggregate.caseRecord.currentStage).toBe("D4");
    expect(aggregate.stages.D4.workingContent).toContain("D4 根本原因分析工作稿");
    expect(guided?.focusArea).toBe("D4");
    expect(guided?.suggestedQuestions).toEqual([
      "先确认这次异常的 change point 是什么，以及发生原因和流出原因各自被什么证据支持。",
    ]);
    expect(assistantMessage).toContain("change point");
  });

  it("builds D4 around occurrence escape evidence and validation for urgent complaints", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，工单WO-260320，SMT2号线夜班生产，客户产线停线。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货和库存冻结，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "替代料导入后卷带方向与原厂相反，AOI 阈值也被放宽，需继续验证。",
      contextStage: "D4",
    });

    expect(aggregate.stages.D4.workingContent).toContain("发生原因");
    expect(aggregate.stages.D4.workingContent).toContain("流出原因");
    expect(aggregate.stages.D4.workingContent).toContain("当前证据");
    expect(aggregate.stages.D4.workingContent).toContain("待验证项");
    expect(aggregate.messages.at(-1)?.content ?? "").toContain("change point");
  });

  it("keeps urgent complaints focused on D4 until the cause chain is explicitly confirmed", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，位号C25处异常，批次B12，2026-03-21发现，客户产线停线，已暂停出货。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });

    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货和库存冻结，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });

    aggregate = applyEvidence(aggregate, {
      content: "替代料导入后卷带方向与原厂相反，AOI 阈值也被放宽，发生原因和流出原因都需要围绕这个 change point 继续确认。",
      contextStage: "D4",
    });

    const view = buildCaseWorkflowView(aggregate);
    const guided = view.guidedThinking;
    const assistantMessage = aggregate.messages.at(-1)?.content ?? "";

    expect(aggregate.caseRecord.currentStage).toBe("D4");
    expect(aggregate.stages.D5.workingContent).toBe("");
    expect(view.workflowState.d4ConfirmationState).toBe("ready");
    expect(view.eightDPreview.find((item) => item.stage === "D4")?.primaryAction?.label).toBe("确认 D4");
    expect(guided?.focusArea).toBe("D4");
    expect(guided?.suggestedQuestions).toEqual([
      "先确认这次异常的 change point 是什么，以及发生原因和流出原因各自被什么证据支持。",
    ]);
    expect(assistantMessage).toContain("change point");
  });

  it("auto-advances urgent complaints from D5 to D6 once corrective actions are stated explicitly", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，位号C25处异常，批次B12，2026-03-21发现，客户产线停线，已暂停出货。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });

    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货和库存冻结，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });

    aggregate = applyEvidence(aggregate, {
      content: "替代料导入后卷带方向与原厂相反，发生原因和流出原因都需要围绕这个 change point 继续确认。",
      contextStage: "D4",
    });
    aggregate = confirmStage(aggregate, { stage: "D4" });

    aggregate = applyEvidence(aggregate, {
      content: "发生原因侧永久措施是恢复原厂卷带方向并锁定贴片角度，流出原因侧永久措施是收紧AOI阈值并加严放行，系统性纠正措施是更新程序、SOP和培训。",
      contextStage: "D5",
    });

    const guided = buildCaseWorkflowView(aggregate).guidedThinking;
    const assistantMessage = aggregate.messages.at(-1)?.content ?? "";

    expect(aggregate.caseRecord.currentStage).toBe("D6");
    expect(aggregate.stages.D6.workingContent).toContain("D6 实施与验证计划工作稿");
    expect(guided?.focusArea).toBe("D6");
    expect(guided?.suggestedQuestions).toEqual(["当前阶段还有哪些关键动作未完成？"]);
    expect(assistantMessage).toContain("当前阶段还有哪些关键动作未完成");
  });

  it("writes D3 as an actionable containment worksheet instead of a generic suggestion", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技今天早上产线停线，MCU-800 连续 3 片上电爆板冒烟并有火花，要求立即停止发货，并在24小时内给出初步分析和围堵措施。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });

    expect(aggregate.stages.D3.workingContent).toContain("D3 临时遏制措施工作稿");
    expect(aggregate.stages.D3.workingContent).toContain("当前目标：先控住客户现场与批次风险，避免异常继续流出。");
    expect(aggregate.stages.D3.workingContent).toContain("每项请补充：当前动作 / 责任人 / 完成时点 / 关闭条件");
    expect(aggregate.stages.D3.workingContent).not.toContain("临时遏制措施建议");
    expect(aggregate.stages.D3.workingContent).not.toContain("请先按四类对象补齐围堵动作");
  });

  it("writes D4 as a dual-chain investigation worksheet instead of a generic suggestion", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，工单WO-260320，SMT2号线夜班生产，客户产线停线。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货和库存冻结，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "替代料导入后卷带方向与原厂相反，AOI 阈值也被放宽，需继续验证。",
      contextStage: "D4",
    });

    expect(aggregate.stages.D4.workingContent).toContain("D4 根本原因分析工作稿");
    expect(aggregate.stages.D4.workingContent).toContain("当前目标：先分开站稳发生原因链和流出原因链，再决定哪些内容可以写成结论。");
    expect(aggregate.stages.D4.workingContent).toContain("发生原因链");
    expect(aggregate.stages.D4.workingContent).toContain("流出原因链");
    expect(aggregate.stages.D4.workingContent).toContain("高优先级假设");
    expect(aggregate.stages.D4.workingContent).not.toContain("根本原因分析建议");
  });

  it("writes D5-D7 as layered action worksheets instead of generic follow-up suggestions", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，工单WO-260320，SMT2号线夜班生产，客户产线停线。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货和库存冻结，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "替代料导入后卷带方向与原厂相反，AOI 阈值也被放宽，需继续验证。",
      contextStage: "D4",
    });
    aggregate = confirmStage(aggregate, { stage: "D4" });

    expect(aggregate.stages.D5.workingContent).toContain("D5 永久纠正措施工作稿");
    expect(aggregate.stages.D5.workingContent).toContain("发生原因侧永久措施");
    expect(aggregate.stages.D5.workingContent).toContain("流出原因侧永久措施");
    expect(aggregate.stages.D5.workingContent).toContain("系统性纠正措施");
    expect(aggregate.stages.D5.workingContent).toContain("适用边界");
    expect(aggregate.stages.D5.workingContent).not.toContain("D5 永久纠正措施建议");

    aggregate = confirmStage(aggregate, { stage: "D5" });

    expect(aggregate.stages.D6.workingContent).toContain("D6 实施与验证计划工作稿");
    expect(aggregate.stages.D6.workingContent).toContain("实施动作");
    expect(aggregate.stages.D6.workingContent).toContain("验证方法");
    expect(aggregate.stages.D6.workingContent).toContain("样本范围");
    expect(aggregate.stages.D6.workingContent).toContain("通过标准");
    expect(aggregate.stages.D6.workingContent).not.toContain("D6 实施与验证建议");

    aggregate = confirmStage(aggregate, { stage: "D6" });

    expect(aggregate.stages.D7.workingContent).toContain("D7 预防再发生工作稿");
    expect(aggregate.stages.D7.workingContent).toContain("横向展开");
    expect(aggregate.stages.D7.workingContent).toContain("流程/文件更新");
    expect(aggregate.stages.D7.workingContent).toContain("培训与审计");
    expect(aggregate.stages.D7.workingContent).toContain("防呆与管控点");
    expect(aggregate.stages.D7.workingContent).not.toContain("D7 防止再发生建议");
  });

  it("merges LLM extracted facts into the case state while keeping the original evidence flow", () => {
    let aggregate = createCaseAggregate("LLM 抽取");

    aggregate = applyEvidence(
      aggregate,
      {
        content: "客户那边又炸了，情况很急。",
        contextStage: "D2",
      },
      {
        llmExtraction: {
          knownFacts: [
            { field: "customer", value: "大麦科技", source: "llm", confidence: 0.95 },
            { field: "model", value: "MCU-800", source: "llm", confidence: 0.95 },
            { field: "failure_location", value: "C25", source: "llm", confidence: 0.91 },
            { field: "impact", value: "客户产线停线", source: "llm", confidence: 0.92 },
          ],
          assumptions: [
            { statement: "疑似与电源输入端器件相关，待验证。", needsValidation: true },
          ],
          riskFlags: ["客户停线级异常，需持续复审。"],
        },
      }
    );

    expect(aggregate.messages.at(-1)?.role).toBe("assistant");
    expect(aggregate.knownFacts.find((item) => item.field === "customer")?.value).toBe("大麦科技");
    expect(aggregate.knownFacts.find((item) => item.field === "failure_location")?.value).toBe("C25");
    expect(aggregate.assumptions.map((item) => item.statement)).toContain("疑似与电源输入端器件相关，待验证。");
    expect(aggregate.riskFlags).toContain("客户停线级异常，需持续复审。");
  });

  it("auto-drafts D1 from the owner context and keeps D2-D3 moving from fragmented evidence", () => {
    let aggregate = createCaseAggregate("客户客诉");
    aggregate.caseRecord.ownerUserId = "user-alice";

    aggregate = applyEvidence(aggregate, {
      content: "客户华星科技反馈：B19 批次上线后 3 台上电冒烟，客户现场已暂停使用并要求今天先给围堵方案。",
      contextStage: "D2",
    });

    const view = buildCaseWorkflowView(aggregate);

    expect(aggregate.stages.D1.workingContent).toContain("建案人");
    expect(aggregate.stages.D1.workingContent).toContain("user-alice");
    expect(aggregate.stages.D1.workingContent).toContain("客户窗口");
    expect(aggregate.stages.D2.workingContent).toContain("异常现象");
    expect(aggregate.stages.D3.workingContent).toContain("客户现场");
    expect(view.workflowState.focusArea).toBe("D3");
    expect(view.workflowState.nextAsk).toContain("客户端");
  });

  it("treats D4 as the only hard confirmation gate and auto-drafts D5 D7 while steering next ask to D6", () => {
    let aggregate = createCaseAggregate("根因确认");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户华星科技反馈 MCU-900 板卡上电冒烟，批次B19，2026-03-28发现，影响3台，客户现场已暂停使用。",
      contextStage: "D2",
    });
    aggregate = applyEvidence(aggregate, {
      content: "客户现场已封存待检，已发货冻结追查，成品库存扣留，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = applyEvidence(aggregate, {
      content:
        "确认 change point 是替代料卷带方向与原厂相反。发生原因：贴片角度未切换导致反向装配。流出原因：AOI 阈值放宽未拦截。当前证据：复盘程序版本与来料方向记录一致。待验证假设：是否还有其他批次受影响。",
      contextStage: "D4",
    });

    let view = buildCaseWorkflowView(aggregate);
    expect(view.workflowState.d4ConfirmationState).toBe("ready");
    expect(view.eightDPreview.find((item) => item.stage === "D4")?.primaryAction?.label).toBe("确认 D4");

    aggregate = confirmStage(aggregate, { stage: "D4" });
    view = buildCaseWorkflowView(aggregate);

    expect(aggregate.stages.D4.locked).toBe(true);
    expect(aggregate.stages.D5.workingContent).toContain("发生原因侧永久措施");
    expect(aggregate.stages.D7.workingContent).toContain("横向展开");
    expect(view.workflowState.focusArea).toBe("D6");
    expect(view.workflowState.nextAsk).toContain("验证方法");
    expect(view.workflowState.d4ConfirmationState).toBe("confirmed");
  });

  it("marks D5-D7 stale when D4-confirmed judgement is overturned by later evidence", () => {
    let aggregate = createCaseAggregate("回推复审");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户华星科技反馈 MCU-900 板卡上电冒烟，批次B19，2026-03-28发现，影响3台，客户现场已暂停使用。",
      contextStage: "D2",
    });
    aggregate = applyEvidence(aggregate, {
      content: "客户现场已封存待检，已发货冻结追查，成品库存扣留，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = applyEvidence(aggregate, {
      content:
        "确认 change point 是替代料卷带方向与原厂相反。发生原因：贴片角度未切换导致反向装配。流出原因：AOI 阈值放宽未拦截。当前证据：复盘程序版本与来料方向记录一致。待验证假设：是否还有其他批次受影响。",
      contextStage: "D4",
    });
    aggregate = confirmStage(aggregate, { stage: "D4" });

    aggregate = applyEvidence(aggregate, {
      content: "补充证据：根本不是卷带方向问题，而是连接器端子浮高造成瞬时打火，前面 D4 判断要回看。",
      contextStage: "D4",
    });

    const view = buildCaseWorkflowView(aggregate);
    const d5Preview = view.eightDPreview.find((item) => item.stage === "D5");
    const d7Preview = view.eightDPreview.find((item) => item.stage === "D7");

    expect(view.workflowState.d4ConfirmationState).toBe("stale");
    expect(aggregate.stages.D5.impacted).toBe(true);
    expect(aggregate.stages.D6.impacted).toBe(true);
    expect(aggregate.stages.D7.impacted).toBe(true);
    expect(d5Preview?.status).toBe("stale");
    expect(d7Preview?.status).toBe("stale");
    expect(view.eightDPreview.find((item) => item.stage === "D4")?.primaryAction?.label).toBe("重新确认 D4");
  });
});
