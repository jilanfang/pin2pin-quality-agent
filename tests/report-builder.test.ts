import {
  buildActionPlan,
  buildAnalysisSummary,
  buildOutputDocument,
  buildReportCapabilities,
  buildResultRecommendation,
  buildTextOutput,
  renderActionPlanHtml,
  renderAnalysisSummaryHtml,
  renderFormalHtml,
} from "@/lib/domain/report-builder";
import { applyEvidence, confirmStage, createCaseAggregate } from "@/lib/domain/workflow-engine";

function buildInitialReadyAggregate() {
  let aggregate = createCaseAggregate("钽电容客诉");

  aggregate = applyEvidence(aggregate, {
    content: "客户大麦科技反馈 MCU-800 主控板冒烟，批次B12，2026-03-21发现，影响120台。",
    contextStage: "D2",
  });
  aggregate = confirmStage(aggregate, { stage: "D2" });
  aggregate = applyEvidence(aggregate, {
    content: "已暂停出货、冻结库存并安排客户端全检。",
    contextStage: "D3",
  });
  aggregate = confirmStage(aggregate, { stage: "D3" });
  aggregate = applyEvidence(aggregate, {
    content: "怀疑钽电容极性反向贴装，需要验证发生原因和逃逸原因。",
    contextStage: "D4",
  });

  return aggregate;
}

describe("reportBuilder", () => {
  it("builds analysis summary from confirmed facts and keeps unverified root cause out of conclusions", () => {
    const aggregate = buildInitialReadyAggregate();

    const summary = buildAnalysisSummary(aggregate);

    expect(summary.title).toBe("分析结论");
    expect(summary.confirmedFacts.join(" ")).toContain("批次");
    expect(summary.openQuestions.length).toBeGreaterThan(0);
    expect(summary.risks.join(" ")).toContain("未验证");
    expect(summary.overview).not.toContain("根因已确认");
  });

  it("builds action plan only when containment and corrective direction are available", () => {
    const aggregate = buildInitialReadyAggregate();

    const plan = buildActionPlan(aggregate);

    expect(plan).not.toBeNull();
    expect(plan?.title).toBe("行动方案");
    expect(plan?.immediateActions.join(" ")).toContain("暂停出货");
    expect(plan?.verificationChecks.length).toBeGreaterThan(0);
  });

  it("recommends analysis summary before 8D when facts are stable but closure threshold is not met", () => {
    const aggregate = buildInitialReadyAggregate();

    const recommendation = buildResultRecommendation(aggregate);

    expect(recommendation.kind).toBe("analysis_summary");
    expect(recommendation.title).toBe("建议先整理分析结论");
    expect(recommendation.rationale).toContain("不建议直接生成 8D");
  });

  it("recommends 8D only when all stages are closed and no impacted stage remains", () => {
    let aggregate = buildInitialReadyAggregate();
    aggregate = applyEvidence(aggregate, {
      content: "QE、PE、SMT、IQC、客服负责人已组建团队。",
      contextStage: "D1",
    });
    aggregate = confirmStage(aggregate, { stage: "D1" });

    for (const stage of ["D4", "D5", "D6", "D7", "D8"] as const) {
      aggregate = applyEvidence(aggregate, {
        content: `${stage} 已补充完整内容。`,
        contextStage: stage,
      });
      aggregate = confirmStage(aggregate, { stage });
    }

    const recommendation = buildResultRecommendation(aggregate);

    expect(recommendation.kind).toBe("eight_d");
    expect(recommendation.title).toBe("建议生成 8D");
  });

  it("renders analysis summary preview as a compact conclusion artifact instead of an 8D report", () => {
    const aggregate = buildInitialReadyAggregate();
    const summary = buildAnalysisSummary(aggregate);
    const html = renderAnalysisSummaryHtml(summary, aggregate);

    expect(html).toContain("分析结论");
    expect(html).toContain("已确认事实");
    expect(html).toContain("待确认 / 待补信息");
    expect(html).not.toContain("D1");
    expect(html).not.toContain("D8");
    expect(html).not.toContain("完整 8D");
  });

  it("renders action plan preview as an action artifact instead of reusing 8D sections", () => {
    let aggregate = buildInitialReadyAggregate();
    aggregate = applyEvidence(aggregate, {
      content: "D5 已补充长期纠正措施和责任人。",
      contextStage: "D5",
    });

    const plan = buildActionPlan(aggregate);
    if (!plan) {
      throw new Error("Expected action plan");
    }
    const html = renderActionPlanHtml(plan, aggregate);

    expect(html).toContain("行动方案");
    expect(html).toContain("立即动作");
    expect(html).toContain("验证检查");
    expect(html).not.toContain("D4");
    expect(html).not.toContain("D8");
    expect(html).not.toContain("完整 8D");
  });

  it("allows initial_24h output before final closure but blocks final report", () => {
    const aggregate = buildInitialReadyAggregate();
    const capabilities = buildReportCapabilities(aggregate);

    expect(capabilities.formalHtml.allowed).toBe(true);
    expect(capabilities.finalReport.allowed).toBe(false);
    expect(capabilities.finalReport.reasonCodes).toEqual(
      expect.arrayContaining(["d1_incomplete", "stages_unconfirmed"])
    );
  });

  it("allows final report only when D1 is complete and all stages are locked with no impacts", () => {
    let aggregate = buildInitialReadyAggregate();
    aggregate = applyEvidence(aggregate, {
      content: "QE、PE、SMT、IQC、客服负责人已组建团队。",
      contextStage: "D1",
    });
    aggregate = confirmStage(aggregate, { stage: "D1" });

    for (const stage of ["D4", "D5", "D6", "D7", "D8"] as const) {
      aggregate = applyEvidence(aggregate, {
        content: `${stage} 已补充完整内容。`,
        contextStage: stage,
      });
      aggregate = confirmStage(aggregate, { stage });
    }

    const capabilities = buildReportCapabilities(aggregate);

    expect(capabilities.finalReport.allowed).toBe(true);
    expect(capabilities.pdf.allowed).toBe(true);
  });

  it("keeps final preview open until the explicit close action is executed", () => {
    let aggregate = buildInitialReadyAggregate();
    aggregate = applyEvidence(aggregate, {
      content: "QE、PE、SMT、IQC、客服负责人已组建团队。",
      contextStage: "D1",
    });
    aggregate = confirmStage(aggregate, { stage: "D1" });

    for (const stage of ["D4", "D5", "D6", "D7", "D8"] as const) {
      aggregate = applyEvidence(aggregate, {
        content: `${stage} 已补充完整内容。`,
        contextStage: stage,
      });
      aggregate = confirmStage(aggregate, { stage });
    }

    const document = buildOutputDocument(aggregate, {
      reportStage: "final",
      styleMode: "professional_neutral",
    });

    expect(document.exportCapabilities.finalReport.allowed).toBe(true);
    expect(document.caseStatus).toBe("open");
  });

  it("builds an output document with stable metadata and pending items", () => {
    const aggregate = buildInitialReadyAggregate();
    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "professional_neutral",
    });

    expect(document.reportStage).toBe("initial_24h");
    expect(document.caseStatus).toBe("open");
    expect(document.sections).toHaveLength(8);
    expect(document.pendingItems.length).toBeGreaterThan(0);
    expect(document.exportCapabilities.formalHtml.allowed).toBe(true);
  });

  it("renders text output without leaking markdown terminology to the user", () => {
    const aggregate = buildInitialReadyAggregate();
    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "customer_formal",
    });

    const text = buildTextOutput(document);

    expect(text).toContain("8D");
    expect(text).toContain("D2");
    expect(text).not.toContain("markdown");
  });

  it("includes fact basis and validation notes so the draft reads like a working document", () => {
    const aggregate = buildInitialReadyAggregate();
    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "professional_neutral",
    });

    const text = buildTextOutput(document);

    expect(text).toContain("事实基础");
    expect(text).toContain("待验证假设");
    expect(text).toContain("客户");
    expect(text).toContain("批次");
  });

  it("explains quick-response readiness in business language and keeps risky conclusions under validation", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技今天早上产线停线，MCU-800 主控板连续 3 片上电爆板冒烟并有火花，要求立即停止发货，并在24小时内回复。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，成品库存与在制品已冻结，已发货批次正在追查。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "初步怀疑替代料卷带方向变化导致贴装角度异常，发生原因与流出原因仍需继续验证。",
      contextStage: "D4",
    });

    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "customer_formal",
    });
    const text = buildTextOutput(document);

    expect(document.exportCapabilities.formalHtml.allowed).toBe(true);
    expect(text).toContain("当前为快速响应版");
    expect(text).toContain("以下结论仍待验证");
    expect(text).toContain("已确认事实");
    expect(text).toContain("初步判断");
    expect(text).toContain("客户侧/厂内侧当前动作");
    expect(text).not.toContain("根因已完全确认");
  });

  it("renders urgent complaint D3 and D4 as investigation-ready business structures", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，工单WO-260320，SMT2号线夜班生产，客户产线停线并要求24小时回复。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货冻结追查，成品库存扣留，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "替代料导入后卷带方向变化，贴片程序未切换，AOI 阈值被放宽，仍需继续验证。",
      contextStage: "D4",
    });

    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "professional_neutral",
    });
    const text = buildTextOutput(document);

    expect(text).toContain("客户现场");
    expect(text).toContain("已发货");
    expect(text).toContain("成品库存");
    expect(text).toContain("在制品");
    expect(text).toContain("发生原因");
    expect(text).toContain("流出原因");
    expect(text).toContain("当前证据");
    expect(text).toContain("待验证项");
  });

  it("summarizes D4 in the preliminary judgement block without leaking raw worksheet headings", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，工单WO-260320，SMT2号线夜班生产，客户产线停线并要求24小时回复。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货冻结追查，成品库存扣留，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "替代料导入后卷带方向变化，贴片程序未切换，AOI 阈值被放宽，仍需继续验证。",
      contextStage: "D4",
    });

    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "customer_formal",
    });
    const text = buildTextOutput(document);
    const html = renderFormalHtml(document);

    expect(text).toContain("初步判断");
    expect(text).toContain("发生原因链");
    expect(text).toContain("流出原因链");
    expect(text).not.toContain("初步判断\n- D4 根本原因分析工作稿");
    expect(html).toContain("<h2>初步判断</h2>");
    expect(html).toContain("发生原因链");
    expect(html).not.toContain("D4 根本原因分析工作稿</div>");
  });

  it("summarizes current actions from structured containment blocks without leaking raw worksheet headings", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，工单WO-260320，SMT2号线夜班生产，客户产线停线并要求24小时回复。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货冻结追查，成品库存扣留，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });

    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "professional_neutral",
    });
    const text = buildTextOutput(document);
    const html = renderFormalHtml(document);

    expect(text).toContain("客户侧/厂内侧当前动作");
    expect(text).toContain("客户现场：");
    expect(text).toContain("已发货：冻结追查");
    expect(text).not.toContain("客户侧/厂内侧当前动作\n- D3 临时遏制措施工作稿");
    expect(html).toContain("<h2>客户侧 / 厂内侧当前动作</h2>");
    expect(html).toContain("客户现场");
    expect(html).not.toContain("D3 临时遏制措施工作稿</div>");
  });

  it("breaks current actions into customer shipment stock and wip status blocks", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，工单WO-260320，SMT2号线夜班生产，客户产线停线并要求24小时回复。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content:
        "客户现场已封存待检，已发货批次正在冻结追查，成品库存已扣留，在制品暂停投线并等待复判。",
      contextStage: "D3",
    });

    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "professional_neutral",
    });
    const text = buildTextOutput(document);

    expect(text).toContain("客户现场：已封存待检");
    expect(text).toContain("已发货：已冻结追查");
    expect(text).toContain("成品库存：已扣留");
    expect(text).toContain("在制品：暂停投线并等待复判");
  });

  it("treats structured containment facts as sufficient for 24h initial readiness", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技今天早上产线停线，MCU-800 主控板连续 3 片上电爆板冒烟并有火花，位号 C25，要求立即停止发货并在24小时内回复。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content:
        "客户现场已封存待检，已发货批次正在冻结追查，成品库存已扣留，在制品暂停投线并等待复判。",
      contextStage: "D3",
    });
    aggregate = applyEvidence(aggregate, {
      content: "初步怀疑替代料卷带方向变化导致贴装角度异常，仍需继续验证。",
      contextStage: "D4",
    });

    const capabilities = buildReportCapabilities(aggregate);

    expect(capabilities.formalHtml.allowed).toBe(true);
    expect(capabilities.formalHtml.reasonCodes).not.toContain("containment_missing");
  });

  it("surfaces rebuild reasons in text and html outputs when prior judgement is impacted", () => {
    let aggregate = createCaseAggregate("认知重建案例");

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
      content: "补充证据：客户复盘后确认并非C25，而是连接器处瞬间打火，前序失效部位判断需要复审。",
      contextStage: "D2",
    });

    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "professional_neutral",
    });
    const text = buildTextOutput(document);
    const html = renderFormalHtml(document);

    expect(text).toContain("复审提示");
    expect(text).toContain("失效位置已从 C25 调整为 连接器处");
    expect(text).toContain("原先围堵边界和原因链判断需要重算");
    expect(text).toContain("建议回看：D3 / D4");
    expect(text).toContain("暂时不稳的结论：围堵边界、原因链判断");
    expect(text).toContain("D3 临时遏制措施 [待复审]");
    expect(text).toContain("D4 根本原因分析 [待复审]");
    expect(html).toContain("复审提示");
    expect(html).toContain("失效位置已从 C25 调整为 连接器处");
    expect(html).toContain("原先围堵边界和原因链判断需要重算");
    expect(html).toContain("围堵边界、原因链判断");
    expect(html).toContain("D3 临时遏制措施 [待复审]");
    expect(html).toContain("D4 根本原因分析 [待复审]");
  });

  it("renders D3 and D4 sections as formal report content instead of raw worksheets", () => {
    let aggregate = createCaseAggregate("紧急客诉");

    aggregate = applyEvidence(aggregate, {
      content:
        "客户大麦科技反馈 MCU-800 主控板爆板冒烟，工单WO-260320，SMT2号线夜班生产，客户产线停线并要求24小时回复。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "客户端封存待检，已发货冻结追查，成品库存扣留，在制品暂停投线。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "替代料导入后卷带方向变化，贴片程序未切换，AOI 阈值被放宽，仍需继续验证。",
      contextStage: "D4",
    });

    const document = buildOutputDocument(aggregate, {
      reportStage: "initial_24h",
      styleMode: "professional_neutral",
    });
    const d3Section = document.sections.find((section) => section.sectionKey === "D3");
    const d4Section = document.sections.find((section) => section.sectionKey === "D4");

    expect(d3Section?.content).toContain("客户侧围堵");
    expect(d3Section?.content).toContain("厂内侧围堵");
    expect(d3Section?.content).toContain("当前围堵判断");
    expect(d3Section?.content).not.toContain("D3 临时遏制措施工作稿");
    expect(d3Section?.content).not.toContain("当前目标：");
    expect(d4Section?.content).toContain("发生原因");
    expect(d4Section?.content).toContain("流出原因");
    expect(d4Section?.content).toContain("系统性原因");
    expect(d4Section?.content).toContain("待验证项");
    expect(d4Section?.content).not.toContain("D4 根本原因分析工作稿");
    expect(d4Section?.content).not.toContain("当前目标：");
  });

  it("renders D5-D7 sections as expert-readable action layers instead of worksheet scaffolding", () => {
    let aggregate = buildInitialReadyAggregate();
    aggregate = applyEvidence(aggregate, {
      content: "QE、PE、SMT、IQC、客服负责人已组建团队。",
      contextStage: "D1",
    });
    aggregate = confirmStage(aggregate, { stage: "D1" });
    aggregate = confirmStage(aggregate, { stage: "D4" });
    aggregate = confirmStage(aggregate, { stage: "D5" });
    aggregate = confirmStage(aggregate, { stage: "D6" });

    const document = buildOutputDocument(aggregate, {
      reportStage: "interim",
      styleMode: "professional_neutral",
    });
    const d5Section = document.sections.find((section) => section.sectionKey === "D5");
    const d6Section = document.sections.find((section) => section.sectionKey === "D6");
    const d7Section = document.sections.find((section) => section.sectionKey === "D7");

    expect(d5Section?.content).toContain("发生原因侧永久措施");
    expect(d5Section?.content).toContain("流出原因侧永久措施");
    expect(d5Section?.content).toContain("系统性纠正措施");
    expect(d5Section?.content).not.toContain("D5 永久纠正措施工作稿");
    expect(d6Section?.content).toContain("实施计划");
    expect(d6Section?.content).toContain("验证安排");
    expect(d6Section?.content).toContain("通过标准");
    expect(d6Section?.content).not.toContain("D6 实施与验证计划工作稿");
    expect(d7Section?.content).toContain("横向展开");
    expect(d7Section?.content).toContain("流程/文件更新");
    expect(d7Section?.content).toContain("培训与审计");
    expect(d7Section?.content).not.toContain("D7 预防再发生工作稿");
  });
});
