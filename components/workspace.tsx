"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";

type CaseSummary = {
  id: string;
  title: string;
  status: string;
  currentStage: string;
  mode: string;
  d1Status: string;
  updatedAt: string;
};

type StageRecord = {
  stage: string;
  workingContent: string;
  confirmedContent: string;
  locked: boolean;
  impacted: boolean;
  impactSummary: string | null;
  lastReviewedAt: string | null;
};

type GapItem = {
  field: string;
  reason: string;
  priority: string;
};

type GuidedThinking = {
  focusArea: string;
  thinkingGoal: string;
  guidanceText: string;
  suggestedQuestions: string[];
  checkpoints: string[];
  warnings: string[];
} | null;

type ReportCapabilities = {
  text: { allowed: boolean; reasonCodes: string[] };
  formalHtml: { allowed: boolean; reasonCodes: string[] };
  finalReport: { allowed: boolean; reasonCodes: string[] };
  pdf: { allowed: boolean; reasonCodes: string[] };
};

type CaseWorkflow = {
  caseId: string;
  title: string;
  status: string;
  currentStage: string;
  mode: string;
  d1Status: string;
  messages: {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    messageType: "evidence" | "assistant_note" | "system";
    createdAt: string;
  }[];
  stages: StageRecord[];
  warnings: string[];
  missingFields: GapItem[];
  guidedThinking: GuidedThinking;
  knownFacts: { field: string; value: string }[];
  assumptions: { statement: string; needsValidation: boolean }[];
  riskFlags: string[];
  reportCapabilities: ReportCapabilities;
};

type ReportPreview = {
  document: {
    reportStage: string;
    styleMode: string;
    caseStatus: string;
  };
  text: string;
  html: string;
  warnings: string[];
};

type SummaryItem = {
  key: string;
  label: string;
  value: string;
  tone?: "signal" | "warning" | "default";
};

type OutputGuidance = {
  recommendedLabel: string;
  rationale: string;
};

type ExpertReviewSnapshot = {
  factCount: number;
  assumptionCount: number;
  riskCount: number;
  causeChainLabel: string;
  actionLayerLabel: string;
};

type CopilotBrief = {
  currentView: string;
  whyThis: string;
  nextNeed: string;
};

type RebuildReviewCard = {
  changedWhat: string;
  revisitStages: string;
  whyRevisit: string;
  unstableConclusions: string;
};

const seedCases = [
  {
    key: "tantalum_reverse_polarity",
    title: "钽电容反向贴装客诉案例",
    description: "完整的电子制造客诉样例，适合直接演示阶段推进与报告输出。",
  },
  {
    key: "fragmented_regression_case",
    title: "信息渐进推翻案例",
    description: "模拟现场信息零碎、逐步补充且会推翻前序判断的异常处理过程。",
  },
] as const;

const reportStageOptions = [
  { value: "initial_24h", label: "快速响应版" },
  { value: "interim", label: "阶段更新版" },
  { value: "final", label: "完整 8D" },
] as const;

const styleModeOptions = [
  { value: "professional_neutral", label: "专业克制" },
  { value: "customer_formal", label: "对客正式" },
  { value: "internal_direct", label: "内部直给" },
] as const;

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function readJson(response: Response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(payload.error || "请求失败");
  }
  return response.json();
}

function capabilityLabel(capability: { allowed: boolean; reasonCodes: string[] }) {
  if (capability.allowed) return "可用";
  return capability.reasonCodes.length
    ? capability.reasonCodes.map((code) => capabilityReasonCopy(code)).join("；")
    : "暂不可用";
}

function capabilityReasonCopy(reasonCode: string) {
  const copyMap: Record<string, string> = {
    d2_unconfirmed: "请先确认 D2 问题描述",
    containment_missing: "请先补齐 D3 临时围堵措施",
    analysis_direction_missing: "请先补充 D4 分析方向或待验证假设",
    d1_incomplete: "待补齐 D1 团队与职责信息",
    impacted_stages: "存在受影响章节，请先复审",
    stages_unconfirmed: "仍有章节未确认，暂不能出完整 8D",
  };
  return copyMap[reasonCode] ?? reasonCode;
}

function initialReadinessCopyForCase(currentCase: CaseWorkflow | null) {
  if (!currentCase) return "待判断";
  if (currentCase.reportCapabilities.formalHtml.allowed) {
    return "问题描述、围堵动作、根因方向已具备";
  }

  const gapMap = new Map(currentCase.missingFields.map((item) => [item.field, item.reason]));
  const blockers: string[] = [];

  if (currentCase.reportCapabilities.formalHtml.reasonCodes.includes("d2_unconfirmed")) {
    blockers.push("问题描述未确认");
  }
  if (currentCase.reportCapabilities.formalHtml.reasonCodes.includes("containment_missing")) {
    blockers.push("围堵状态未具备");
  }
  if (gapMap.has("failure_location")) {
    blockers.push("失效位置未明确");
  }
  if (currentCase.reportCapabilities.formalHtml.reasonCodes.includes("analysis_direction_missing")) {
    blockers.push("根因方向未形成");
  }

  const uniqueBlockers = [...new Set(blockers)];
  if (uniqueBlockers.length) {
    return `还差${uniqueBlockers.join("；")}`;
  }

  return capabilityLabel(currentCase.reportCapabilities.formalHtml);
}

function caseStatusLabel(status?: string) {
  return status === "closed" ? "已结案" : "处理中";
}

function d1StatusLabel(status?: string) {
  if (status === "complete") return "完整";
  if (status === "partial") return "部分完成";
  return "未开始";
}

function stageCardCopy(record: StageRecord) {
  if (record.locked) {
    return record.confirmedContent || "已确认";
  }
  return record.workingContent || "待补充";
}

function stageCardPreview(record: StageRecord) {
  const source = stageCardCopy(record).trim();
  const withoutContext = source.replace(/\s*已确认上下文：[\s\S]*$/u, "").trim();
  const normalized = withoutContext
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  const preview = lines.join("\n") || normalized || "待补充";
  return preview.length > 220 ? `${preview.slice(0, 220).trim()}...` : preview;
}

function orderedFacts(items: { field: string; value: string }[]) {
  const priority = ["customer", "model", "batch", "work_order", "impact", "line", "discovery_time"];
  const ranking = new Map(priority.map((item, index) => [item, index]));
  return [...items].sort((left, right) => {
    const leftRank = ranking.get(left.field) ?? 999;
    const rightRank = ranking.get(right.field) ?? 999;
    return leftRank - rightRank;
  });
}

function factLabel(field: string) {
  const labels: Record<string, string> = {
    severity: "严重度",
    mode: "模式",
    customer: "客户",
    model: "机种",
    batch: "批次",
    work_order: "工单",
    impact: "影响",
    line: "线别",
    discovery_time: "发现时间",
    problem_symptom: "异常现象",
  };
  return labels[field] ?? field;
}

function guidanceFacts(items: { field: string; value: string }[]) {
  return orderedFacts(items).slice(0, 4);
}

function factValue(items: { field: string; value: string }[], field: string) {
  return items.find((item) => item.field === field)?.value;
}

function buildOutputGuidance(currentCase: CaseWorkflow | null): OutputGuidance | null {
  if (!currentCase) return null;
  const isUrgentComplaint =
    factValue(currentCase.knownFacts, "mode") === "customer_complaint_urgent";
  const gapMap = new Map(currentCase.missingFields.map((item) => [item.field, item.reason]));

  if (currentCase.reportCapabilities.finalReport.allowed) {
    return {
      recommendedLabel: "完整 8D（可结案）",
      rationale: "所有关键阶段已确认，可直接生成完整 8D。",
    };
  }

  if (currentCase.reportCapabilities.formalHtml.allowed) {
    return {
      recommendedLabel: "快速响应版（可流转）",
      rationale: "问题描述、围堵动作和分析方向已具备，可先对内对外同步一版。",
    };
  }

  if (isUrgentComplaint) {
    if (gapMap.has("failure_location") || gapMap.has("containment_status")) {
      return {
        recommendedLabel: "分析摘要（建议）",
        rationale:
          "还不能交快速响应版，先确认失效位置，再逐项补齐客户现场、已发货、成品库存、在制品的围堵状态。",
      };
    }

    if (gapMap.has("batch_trace")) {
      return {
        recommendedLabel: "分析摘要（建议）",
        rationale: "围堵已有基础，但还要先锁工单、批次、线别或生产时间，避免追溯边界失真。",
      };
    }
  }

  return {
    recommendedLabel: "分析摘要（建议）",
    rationale: "正式报告还不能出，先继续补失效位置和围堵状态，避免把未稳信息写成正式稿。",
  };
}

function buildExpertReviewSnapshot(currentCase: CaseWorkflow | null): ExpertReviewSnapshot | null {
  if (!currentCase) return null;

  const factCount = Math.min(currentCase.knownFacts.length, 4);
  const assumptionCount = currentCase.assumptions.filter((item) => item.needsValidation).length;
  const riskCount = currentCase.riskFlags.length;
  const hasD4 =
    !!currentCase.stages.find((item) => item.stage === "D4")?.confirmedContent ||
    !!currentCase.stages.find((item) => item.stage === "D4")?.workingContent;
  const hasActionLayers = ["D5", "D6", "D7"].every((stage) => {
    const record = currentCase.stages.find((item) => item.stage === stage);
    return !!record?.confirmedContent || !!record?.workingContent;
  });
  const causeChainLabel =
    currentCase.reportCapabilities.finalReport.allowed || hasD4 ? "原因链已成形" : "原因链待收口";
  const actionLayerLabel =
    currentCase.reportCapabilities.finalReport.allowed || hasActionLayers
      ? "措施层次已成形"
      : "措施层次待补强";

  return {
    factCount,
    assumptionCount,
    riskCount,
    causeChainLabel,
    actionLayerLabel,
  };
}

function currentImpactSummary(currentCase: CaseWorkflow | null) {
  if (!currentCase) return null;
  return currentCase.stages.find((stage) => stage.impacted)?.impactSummary ?? null;
}

function buildCopilotBrief(
  currentCase: CaseWorkflow | null,
  nextQuestion: string | null,
  isUrgentComplaint: boolean
): CopilotBrief | null {
  if (!currentCase) return null;

  if (isUrgentComplaint) {
    return {
      currentView: "这是客户停线级异常，当前先控住影响范围。",
      whyThis: "失效位置和围堵状态决定你能不能先止血并交出快速响应版。",
      nextNeed: nextQuestion ?? "先确认失效位置，以及客户现场、已发货、库存、在制品分别怎么处理。",
    };
  }

  const focusArea = currentCase.guidedThinking?.focusArea ?? currentCase.currentStage;
  return {
    currentView: currentCase.guidedThinking?.guidanceText ?? "当前先补事实，再继续推进分析和结论。",
    whyThis: `当前先推进 ${focusArea}，避免同时铺开太多方向导致判断失真。`,
    nextNeed: "先补一条最关键的现场证据，我会据此继续推进下一步。",
  };
}

function buildRebuildReviewCard(currentCase: CaseWorkflow | null): RebuildReviewCard | null {
  if (!currentCase) return null;
  const impactedStages = currentCase.stages.filter((stage) => stage.impacted);
  if (!impactedStages.length) return null;

  const changedWhat = impactedStages[0]?.impactSummary ?? "前序判断受影响，需结合新证据重新审视。";
  const revisitStages = impactedStages.map((stage) => stage.stage).join(" / ");
  const whyRevisit =
    impactedStages.some((stage) => stage.stage === "D3" || stage.stage === "D4")
      ? "因为原先围堵边界和原因链判断都建立在旧失效位置上。"
      : "因为后续阶段判断建立在旧证据基础上，继续推进前需要先校正前提。";
  const unstableConclusions =
    impactedStages.some((stage) => stage.stage === "D3" || stage.stage === "D4")
      ? "围堵边界、原因链判断"
      : "后续阶段结论";

  return {
    changedWhat,
    revisitStages,
    whyRevisit,
    unstableConclusions,
  };
}

export function Workspace() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [currentCase, setCurrentCase] = useState<CaseWorkflow | null>(null);
  const [composer, setComposer] = useState("");
  const [titleInput, setTitleInput] = useState("新的 8D 案件");
  const [seedCase, setSeedCase] = useState<(typeof seedCases)[number]["key"] | "">("");
  const [reportStage, setReportStage] = useState<(typeof reportStageOptions)[number]["value"]>(
    "initial_24h"
  );
  const [styleMode, setStyleMode] = useState<(typeof styleModeOptions)[number]["value"]>(
    "professional_neutral"
  );
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedStage, setFocusedStage] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReportToolsOpen, setIsReportToolsOpen] = useState(false);
  const [isStageRailExpanded, setIsStageRailExpanded] = useState(false);

  const currentStageRecord = useMemo(() => {
    if (!currentCase) return null;
    return currentCase.stages.find((item) => item.stage === currentCase.currentStage) ?? null;
  }, [currentCase]);

  const selectedStage = useMemo(() => {
    if (!currentCase) return null;
    return (
      currentCase.stages.find((item) => item.stage === (focusedStage ?? currentCase.currentStage)) ??
      currentStageRecord
    );
  }, [currentCase, currentStageRecord, focusedStage]);

  const summaryFacts = useMemo(() => {
    if (!currentCase) return [];
    return orderedFacts(currentCase.knownFacts).slice(0, 3);
  }, [currentCase]);

  const summaryGaps = useMemo(() => currentCase?.missingFields.slice(0, 1) ?? [], [currentCase]);
  const guidanceFactsList = useMemo(() => (currentCase ? guidanceFacts(currentCase.knownFacts) : []), [currentCase]);
  const guidanceAssumptions = useMemo(
    () => currentCase?.assumptions.filter((item) => item.needsValidation).slice(0, 2) ?? [],
    [currentCase]
  );
  const nextQuestion = currentCase?.guidedThinking?.suggestedQuestions[0] ?? null;
  const isUrgentComplaint =
    factValue(currentCase?.knownFacts ?? [], "mode") === "customer_complaint_urgent";
  const initialReadinessCopy = initialReadinessCopyForCase(currentCase);
  const outputGuidance = buildOutputGuidance(currentCase);
  const expertReviewSnapshot = buildExpertReviewSnapshot(currentCase);
  const impactSummary = currentImpactSummary(currentCase);
  const copilotBrief = buildCopilotBrief(currentCase, nextQuestion, isUrgentComplaint);
  const rebuildReviewCard = buildRebuildReviewCard(currentCase);
  const impactedStageNames = useMemo(
    () => currentCase?.stages.filter((stage) => stage.impacted).map((stage) => stage.stage) ?? [],
    [currentCase]
  );
  const reportStageRiskCopy = impactedStageNames.length
    ? reportStage === "final"
      ? "完整 8D：请先完成复审，再进入结案导出。"
      : "当前版本：可预览，但会连同待复审提示一起导出。"
    : null;
  const previewActionStatus = impactedStageNames.length
    ? reportStage === "final"
      ? "完整 8D（需先复审）"
      : `${reportStageOptions.find((item) => item.value === reportStage)?.label ?? "当前版本"}（含待复审）`
    : null;
  const currentGoalCopy = isUrgentComplaint
    ? "先止血、锁失效位置、补齐四类对象围堵状态"
    : currentCase?.guidedThinking?.thinkingGoal ?? "先补事实，再进入分析";
  const actionFacts = [
    ["客户现场", factValue(currentCase?.knownFacts ?? [], "containment_customer_site")],
    ["已发货", factValue(currentCase?.knownFacts ?? [], "containment_shipped")],
    ["成品库存", factValue(currentCase?.knownFacts ?? [], "containment_stock")],
    ["在制品", factValue(currentCase?.knownFacts ?? [], "containment_wip")],
  ].filter(([, value]) => value);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    if (!currentCase) return [];

    return [
      ...(isUrgentComplaint
        ? [
            {
              key: "severity",
              label: "严重度",
              value: "高压客诉",
              tone: "warning" as const,
            },
            {
              key: "goal",
              label: "当前目标",
              value: currentGoalCopy,
              tone: "signal" as const,
            },
            {
              key: "initial_24h",
              label: "快速响应版",
              value: initialReadinessCopy,
              tone: currentCase.reportCapabilities.formalHtml.allowed ? ("signal" as const) : ("warning" as const),
            },
          ]
        : []),
      {
        key: "status",
        label: "案件状态",
        value: caseStatusLabel(currentCase.status),
        tone: "signal",
      },
      {
        key: "stage",
        label: "当前阶段",
        value: currentCase.currentStage,
        tone: "signal",
      },
      {
        key: "d1",
        label: "D1",
        value: d1StatusLabel(currentCase.d1Status),
        tone: "signal",
      },
      {
        key: "formal-report",
        label: "正式报告",
        value: currentCase.reportCapabilities.formalHtml.allowed
          ? "可用"
          : capabilityLabel(currentCase.reportCapabilities.formalHtml),
        tone: "signal",
      },
      {
        key: "final-report",
        label: "完整 8D",
        value: currentCase.reportCapabilities.finalReport.allowed
          ? "可生成并结案"
          : capabilityLabel(currentCase.reportCapabilities.finalReport),
        tone: currentCase.reportCapabilities.finalReport.allowed ? "default" : "warning",
      },
      ...summaryFacts.map((item) => ({
        key: `fact-${item.field}`,
        label: factLabel(item.field),
        value: item.value,
        tone: "default" as const,
      })),
      ...summaryGaps.map((item) => ({
        key: `gap-${item.field}`,
        label: "待补信息",
        value: item.reason,
        tone: "warning" as const,
      })),
    ];
  }, [currentCase, currentGoalCopy, initialReadinessCopy, isUrgentComplaint, summaryFacts, summaryGaps]);

  const visibleStages = useMemo(() => {
    if (!currentCase) return [];
    if (isStageRailExpanded) return currentCase.stages;
    const target = selectedStage?.stage ?? currentCase.currentStage;
    return currentCase.stages.filter((stage) => stage.stage === target);
  }, [currentCase, isStageRailExpanded, selectedStage]);

  useEffect(() => {
    if (!currentCase) return;
    setFocusedStage(currentCase.currentStage);
    setIsStageRailExpanded(false);
  }, [currentCase?.caseId, currentCase?.currentStage]);

  async function refreshCases(nextCaseId?: string) {
    const payload = (await readJson(await fetch("/api/cases"))) as CaseSummary[];
    setCases(payload);
    if (nextCaseId) {
      setCurrentCaseId(nextCaseId);
    } else if (!currentCaseId && payload[0]) {
      setCurrentCaseId(payload[0].id);
    } else if (currentCaseId && !payload.some((item) => item.id === currentCaseId)) {
      setCurrentCaseId(payload[0]?.id ?? null);
    }
  }

  async function refreshCurrentCase(caseId: string) {
    const payload = (await readJson(await fetch(`/api/cases/${caseId}`))) as CaseWorkflow;
    setCurrentCase(payload);
  }

  useEffect(() => {
    void refreshCases();
  }, []);

  useEffect(() => {
    if (!currentCaseId) return;
    void refreshCurrentCase(currentCaseId);
  }, [currentCaseId]);

  async function createCase() {
    setLoading(true);
    setError(null);
    try {
      const payload = (await readJson(
        await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titleInput.trim() || "新的 8D 案件",
            seedCase: seedCase || undefined,
          }),
        })
      )) as CaseSummary;

      await refreshCases(payload.id);
      await refreshCurrentCase(payload.id);
      setComposer("");
      setSeedCase("");
      setIsCreateOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "创建案件失败");
    } finally {
      setLoading(false);
    }
  }

  async function sendEvidence() {
    if (!currentCaseId || !composer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await readJson(
        await fetch(`/api/cases/${currentCaseId}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: composer,
            contextStage: currentCase?.currentStage,
          }),
        })
      )) as CaseWorkflow;
      setCurrentCase(payload);
      setComposer("");
      await refreshCases(currentCaseId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "提交证据失败");
    } finally {
      setLoading(false);
    }
  }

  async function stageAction(stage: string, action: "confirm" | "unlock" | "revalidate") {
    if (!currentCaseId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await readJson(
        await fetch(`/api/cases/${currentCaseId}/stages/${stage}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      )) as CaseWorkflow;
      setCurrentCase(payload);
      await refreshCases(currentCaseId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "阶段操作失败");
    } finally {
      setLoading(false);
    }
  }

  async function openPreview() {
    if (!currentCaseId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await readJson(
        await fetch(
          `/api/cases/${currentCaseId}/report-preview?reportStage=${reportStage}&styleMode=${styleMode}`
        )
      )) as ReportPreview;
      setPreview(payload);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "预览生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function closeCaseWithFinalReport() {
    if (!currentCaseId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await readJson(
        await fetch(
          `/api/cases/${currentCaseId}/report?reportStage=final&styleMode=${styleMode}`,
          {
            method: "POST",
          }
        )
      )) as CaseWorkflow;
      setCurrentCase(payload);
      await refreshCases(currentCaseId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "生成完整 8D 失败");
    } finally {
      setLoading(false);
    }
  }

  const currentSeedDescription = seedCases.find((item) => item.key === seedCase)?.description;
  const hasCases = cases.length > 0;

  function startWithSeedCase(defaultSeedCase: (typeof seedCases)[number]["key"]) {
    setSeedCase(defaultSeedCase);
    setIsCreateOpen(true);
  }

  function startWithBlankCase() {
    setSeedCase("");
    setIsCreateOpen(true);
  }

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-line">
            <strong>芯科元析</strong>
            <span>Pin2Pin 出品的失效分析工作台</span>
          </div>
          <p>把零碎异常整理成可推进、可复审、可交付的分析工作流。</p>
        </div>

        <section className="panel grow">
          <div className="panel-head">
            <strong>案件列表</strong>
            <div className="sidebar-actions">
              <span>{cases.length}</span>
              <button
                className="ghost-button sidebar-mini-button"
                type="button"
                onClick={() => setIsCreateOpen((value) => !value)}
              >
                {isCreateOpen ? "收起新建" : "新建案件"}
              </button>
            </div>
          </div>
          {!hasCases ? (
            <div className="first-run-card">
              <span className="eyebrow">开始第一单</span>
              <h3>先跑通第一单，再继续补证据和出稿。</h3>
              <p>推荐先加载一个种子案例，3 分钟内看到第一版结果。</p>
              <p>如果你手头已经有真实异常，也可以直接新建空白案件开始录入。</p>
              <div className="first-run-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => startWithSeedCase(seedCases[0].key)}
                >
                  从种子案例开始
                </button>
                <button className="ghost-button" type="button" onClick={startWithBlankCase}>
                  新建空白案件
                </button>
              </div>
            </div>
          ) : null}
          {isCreateOpen ? (
            <div className="create-drawer">
              <label className="field">
                <span>案件标题</span>
                <input value={titleInput} onChange={(event) => setTitleInput(event.target.value)} />
              </label>
              <label className="field">
                <span>种子案例</span>
                <select value={seedCase} onChange={(event) => setSeedCase(event.target.value as typeof seedCase)}>
                  <option value="">空白案件</option>
                  {seedCases.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="helper">{currentSeedDescription ?? "可直接加载演示数据，所有后续交互仍走真实 API。"}</p>
              <button className="primary-button" type="button" onClick={createCase} disabled={loading}>
                创建案件
              </button>
            </div>
          ) : null}
          <div className="case-list">
            {cases.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`case-card${item.id === currentCaseId ? " active" : ""}`}
                onClick={() => setCurrentCaseId(item.id)}
              >
                <div className="case-title">{item.title}</div>
                <div className="case-meta">
                  <span>{item.currentStage}</span>
                  <span>{formatTime(item.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            <h2>{currentCase?.title ?? "选择一个案件开始"}</h2>
            <p>
              <span>阶段 {currentCase?.currentStage ?? "D2"}</span>
              <span>D1 {d1StatusLabel(currentCase?.d1Status)}</span>
              <span>{caseStatusLabel(currentCase?.status)}</span>
            </p>
          </div>
          <div className="hero-actions">
            <button
              className="secondary-button quick-preview-button"
              type="button"
              onClick={openPreview}
              disabled={!currentCaseId || loading}
            >
              快速预览报告
            </button>
            <button
              className="ghost-button toolbar-toggle"
              type="button"
              onClick={() => setIsReportToolsOpen((value) => !value)}
            >
              {isReportToolsOpen ? "收起报告工具" : "打开报告工具"}
            </button>
            {isReportToolsOpen ? (
              <div className="report-tooltray">
                {impactedStageNames.length ? (
                  <div className="tooltray-warning" role="status">
                    <strong>当前报告含待复审章节</strong>
                    <span>{`建议先回看 ${impactedStageNames.join(" / ")}，再决定是否导出正式稿。`}</span>
                    {reportStageRiskCopy ? <em>{reportStageRiskCopy}</em> : null}
                  </div>
                ) : null}
                <label className="field compact">
                  <span>报告版本</span>
                  <select value={reportStage} onChange={(event) => setReportStage(event.target.value as typeof reportStage)}>
                    {reportStageOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field compact">
                  <span>文风</span>
                  <select value={styleMode} onChange={(event) => setStyleMode(event.target.value as typeof styleMode)}>
                    {styleModeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="preview-action-group">
                  <button className="secondary-button" type="button" onClick={openPreview} disabled={!currentCaseId || loading}>
                    生成预览
                  </button>
                  {previewActionStatus ? <span className="preview-action-status">{previewActionStatus}</span> : null}
                </div>
                {reportStage === "final" ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={closeCaseWithFinalReport}
                    disabled={!currentCaseId || loading || !currentCase?.reportCapabilities.finalReport.allowed}
                    title={
                      currentCase?.reportCapabilities.finalReport.allowed
                        ? "生成完整 8D 并将案件状态切换为已结案"
                        : capabilityLabel(
                            currentCase?.reportCapabilities.finalReport ?? {
                              allowed: false,
                              reasonCodes: [],
                            }
                          )
                    }
                  >
                    生成完整 8D 并结案
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        {error ? <div className="alert error">{error}</div> : null}

        {!currentCaseId ? (
          <section className="panel onboarding-panel">
            <div className="panel-head">
              <strong>开始第一单</strong>
              <span>试用准备</span>
            </div>
            <div className="onboarding-grid">
              <article className="onboarding-card">
                <span className="eyebrow">推荐路径</span>
                <h3>先选择一个案件，或从上方直接开始第一单。</h3>
                <p>推荐路径：先加载种子案例，看完整流程；再用真实案件验证。</p>
              </article>
              <article className="onboarding-card">
                <span className="eyebrow">你会得到什么</span>
                <h3>先整理事实，再识别缺口，再看到第一版结果。</h3>
                <p>还没有案件时，报告区会在你创建或载入案件后自动准备。</p>
              </article>
            </div>
          </section>
        ) : null}

        <section className="conversation-shell panel">
          <div className="conversation-head">
            <strong>AI 协作区</strong>
            <span>{loading ? "处理中…" : currentCaseId ? "对话驱动推进" : "先创建或选择一个案件"}</span>
          </div>

          <div className="conversation-feed">
            {!currentCaseId ? (
              <article className="message-card message-assistant message-empty">
                <span className="message-role">AI 协作</span>
                <h3>先创建或载入一个案件，我再带着你把第一单跑通。</h3>
                <p>
                  先从左侧加载种子案例，或者新建空白案件。案件建立后，再输入客户投诉、测试结论、批次工单或现场观察，我会先帮你识别事实、指出缺口，再给出下一步最值得补的证据。
                </p>
              </article>
            ) : (
              <>
                {(currentCase?.messages.length ? currentCase.messages : []).map((message) => (
                  <article
                    key={message.id}
                    className={`message-card ${
                      message.role === "user" ? "message-user" : "message-assistant"
                    }`}
                  >
                    <div className="message-meta">
                      <span className="message-role">{message.role === "user" ? "你" : "AI 助手"}</span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <div className="message-content">{message.content}</div>
                  </article>
                ))}

                <article className="message-card message-assistant stage-focus-card">
                  <div className="message-meta">
                    <span className="message-role">当前阶段</span>
                    <span>{selectedStage?.stage ?? currentCase?.currentStage ?? "D2"}</span>
                  </div>
                  {impactSummary ? (
                    <div className="inline-alert" role="status">
                      <strong>案件认知已变化</strong>
                      <p>{impactSummary}</p>
                    </div>
                  ) : null}
                  {rebuildReviewCard ? (
                    <div className="rebuild-review-card" data-testid="rebuild-review-card">
                      <div className="rebuild-review-head">
                        <strong>复审提示</strong>
                        <span>先校正认知，再继续推进</span>
                      </div>
                      <div className="rebuild-review-grid">
                        <div className="rebuild-review-item">
                          <span className="copilot-label">变了什么</span>
                          <p>{rebuildReviewCard.changedWhat}</p>
                        </div>
                        <div className="rebuild-review-item">
                          <span className="copilot-label">先回看哪一步</span>
                          <p>{rebuildReviewCard.revisitStages}</p>
                        </div>
                        <div className="rebuild-review-item">
                          <span className="copilot-label">为什么先回这里</span>
                          <p>{rebuildReviewCard.whyRevisit}</p>
                        </div>
                        <div className="rebuild-review-item">
                          <span className="copilot-label">暂时不稳的结论</span>
                          <p>{rebuildReviewCard.unstableConclusions}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {copilotBrief ? (
                    <div className="copilot-brief" data-testid="copilot-brief">
                      <div className="copilot-brief-item">
                        <span className="copilot-label">我现在怎么看</span>
                        <p>{copilotBrief.currentView}</p>
                      </div>
                      <div className="copilot-brief-item">
                        <span className="copilot-label">为什么先问这个</span>
                        <p>{copilotBrief.whyThis}</p>
                      </div>
                      <div className="copilot-brief-item">
                        <span className="copilot-label">你只需要补什么</span>
                        <p>{copilotBrief.nextNeed}</p>
                      </div>
                    </div>
                  ) : null}
                  <h3>{currentCase?.guidedThinking?.thinkingGoal ?? "发送第一条证据后，我会在这里持续推进。"} </h3>
                  <p>{currentCase?.guidedThinking?.guidanceText ?? "先补事实，再进入分析。"} </p>
                  <div className="copilot-grid">
                    <section className="copilot-panel">
                      <span className="copilot-label">已知事实</span>
                      {guidanceFactsList.length ? (
                        <ul className="list compact-list">
                          {guidanceFactsList.map((item) => (
                            <li key={`${item.field}-${item.value}`}>{`${factLabel(item.field)}：${item.value}`}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="copilot-empty">还没有稳定事实，先补现象、时间、批次和影响范围。</p>
                      )}
                    </section>

                    <section className="copilot-panel">
                      <span className="copilot-label">当前缺口</span>
                      {currentCase?.missingFields.length ? (
                        <ul className="list compact-list">
                          {currentCase.missingFields.slice(0, 3).map((item) => (
                            <li key={`${item.field}-${item.reason}`}>{item.reason}</li>
                          ))}
                        </ul>
                      ) : guidanceAssumptions.length ? (
                        <ul className="list compact-list">
                          {guidanceAssumptions.map((item) => (
                            <li key={item.statement}>{item.statement}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="copilot-empty">当前关键缺口已较少，可以继续确认本阶段工作稿。</p>
                      )}
                    </section>

                    <section className="copilot-panel">
                      <span className="copilot-label">下一步建议</span>
                      <p className="copilot-next">{nextQuestion ?? "继续补充当前阶段证据，或确认进入下一步。"}</p>
                      {currentCase?.riskFlags.length ? (
                        <div className="mini-note">{currentCase.riskFlags.slice(0, 1).join("；")}</div>
                      ) : null}
                    </section>

                    {isUrgentComplaint && actionFacts.length ? (
                      <section className="copilot-panel">
                        <span className="copilot-label">客户侧 / 厂内侧当前动作</span>
                        <ul className="list compact-list">
                          {actionFacts.map(([label, value]) => (
                            <li key={`${label}-${value}`}>{`${label}：${value}`}</li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {outputGuidance ? (
                      <section className="copilot-panel">
                        <span className="copilot-label">当前最适合输出</span>
                        <p className="copilot-next">{outputGuidance.recommendedLabel}</p>
                        <div className="mini-note">{outputGuidance.rationale}</div>
                      </section>
                    ) : null}

                    {expertReviewSnapshot ? (
                      <section className="copilot-panel">
                        <span className="copilot-label">专家审稿视角</span>
                        <ul className="list compact-list">
                          <li>{`事实 ${expertReviewSnapshot.factCount} 项`}</li>
                          <li>{`假设 ${expertReviewSnapshot.assumptionCount} 项`}</li>
                          <li>{`风险 ${expertReviewSnapshot.riskCount} 项`}</li>
                          <li>{expertReviewSnapshot.causeChainLabel}</li>
                          <li>{expertReviewSnapshot.actionLayerLabel}</li>
                        </ul>
                      </section>
                    ) : null}
                  </div>

                  <div className="stage-rail-wrap">
                    <div className="stage-rail" role="tablist" aria-label="阶段轨迹">
                      {visibleStages.map((stage) => (
                        <button
                          key={stage.stage}
                          type="button"
                          className={`stage-pill${stage.stage === selectedStage?.stage ? " active" : ""}${
                            stage.locked ? " locked" : ""
                          }${stage.impacted ? " impacted" : ""}`}
                          onClick={() => setFocusedStage(stage.stage)}
                        >
                          <span>{stage.stage}</span>
                          <small>{stage.locked ? "已确认" : stage.impacted ? "待复审" : "工作稿"}</small>
                        </button>
                      ))}
                    </div>
                    <button
                      className="ghost-button stage-toggle"
                      type="button"
                      onClick={() => setIsStageRailExpanded((value) => !value)}
                    >
                      {isStageRailExpanded ? "收起阶段" : "展开全部阶段"}
                    </button>
                  </div>

                  {selectedStage ? (
                    <div
                      className={`stage-inline-card${selectedStage.impacted ? " stage-inline-impacted" : ""}`}
                    >
                      <div className="stage-head">
                        <strong>
                          {selectedStage.stage} {selectedStage.stage === currentCase?.currentStage ? "· 当前聚焦" : ""}
                        </strong>
                        <span>{selectedStage.locked ? "已确认" : "待推进"}</span>
                      </div>
                      <p>{stageCardPreview(selectedStage)}</p>
                      {selectedStage.impactSummary ? <div className="mini-note">{selectedStage.impactSummary}</div> : null}
                      <div className="stage-actions">
                        {selectedStage.stage === currentCase?.currentStage ? (
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => stageAction(selectedStage.stage, "confirm")}
                            disabled={loading}
                          >
                            确认并进入下一步
                          </button>
                        ) : null}
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => stageAction(selectedStage.stage, "unlock")}
                          disabled={loading}
                        >
                          解锁
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => stageAction(selectedStage.stage, "revalidate")}
                          disabled={loading}
                        >
                          复审
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              </>
            )}
          </div>

          <div className="composer-shell" data-testid="composer-dock">
            <textarea
              className="composer"
              placeholder="输入客户投诉、测试结论、批次、工单、现场观察，系统会按当前阶段推进。"
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
            />
            <div className="toolbar">
              <button className="primary-button" type="button" onClick={sendEvidence} disabled={!composer.trim() || loading || !currentCaseId}>
                发送证据
              </button>
              <span className="helper-inline">
                {currentCase?.guidedThinking?.focusArea
                  ? `当前建议先推进 ${currentCase.guidedThinking.focusArea}`
                  : "先创建案件，再开始输入证据"}
              </span>
            </div>
          </div>
        </section>

        <section className="summary-strip" data-testid="summary-strip" aria-label="关键摘要">
          <div className="summary-grid">
            {summaryItems.map((item) => (
              <div
                key={item.key}
                className={`summary-card${
                  item.tone === "signal"
                    ? " summary-card-signal"
                    : item.tone === "warning"
                      ? " summary-card-gap"
                      : ""
                }`}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        {preview ? (
          <section className="preview-shell panel">
            <div className="panel-head">
              <strong>报告预览</strong>
              <a
                className="secondary-link"
                href={`/api/cases/${currentCaseId}/report-html?reportStage=${reportStage}&styleMode=${styleMode}`}
                target="_blank"
                rel="noreferrer"
              >
                打开 HTML 报告
              </a>
            </div>
            <div className="preview-meta">
              <span>版本：{preview.document.reportStage}</span>
              <span>文风：{preview.document.styleMode}</span>
              <span>状态：{preview.document.caseStatus}</span>
            </div>
            <div className="preview-grid">
              <pre className="text-preview">{preview.text}</pre>
              <iframe
                className="html-preview"
                title="8D 正式报告预览"
                srcDoc={preview.html}
              />
            </div>
          </section>
        ) : null}
      </main>

      <style>{`
        .workspace-shell {
          display: grid;
          grid-template-columns: 272px minmax(0, 1fr);
          height: 100vh;
          gap: 14px;
          padding: 18px;
          overflow: hidden;
        }

        .sidebar,
        .main-panel {
          min-width: 0;
          min-height: 0;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }

        .main-panel {
          display: grid;
          gap: 12px;
          grid-template-rows: auto auto minmax(0, 1fr);
          min-height: 0;
        }

        .brand-card,
        .panel {
          background: var(--paper);
          border: 1px solid rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(18px);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow);
          padding: 16px;
        }

        .brand-line {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }

        .brand-line strong {
          font-size: 18px;
          letter-spacing: -0.03em;
        }

        .brand-line span {
          font-size: 12px;
          color: var(--muted);
          font-weight: 700;
        }

        .brand-card p,
        .topbar p,
        .helper {
          color: var(--muted);
          line-height: 1.6;
          margin: 0;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: var(--brand-soft);
          color: var(--brand);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .panel {
          display: grid;
          gap: 14px;
          min-height: 0;
        }

        .first-run-card,
        .onboarding-card {
          display: grid;
          gap: 12px;
          padding: 16px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(248, 250, 255, 0.92), rgba(241, 245, 255, 0.9));
          border: 1px solid rgba(215, 221, 234, 0.95);
        }

        .first-run-card h3,
        .onboarding-card h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.35;
          letter-spacing: -0.03em;
        }

        .first-run-card p,
        .onboarding-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.65;
        }

        .first-run-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .onboarding-panel {
          gap: 16px;
        }

        .onboarding-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .panel.grow {
          flex: 1;
          min-height: 0;
        }

        .panel-head,
        .topbar,
        .stage-head,
        .toolbar,
        .hero-actions,
        .preview-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .topbar {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 255, 0.94));
          border: 1px solid rgba(255, 255, 255, 0.65);
          border-radius: 20px;
          padding: 14px 16px;
          box-shadow: var(--shadow);
          align-items: center;
        }

        .topbar-title {
          min-width: 0;
          display: grid;
          gap: 6px;
        }

        .topbar-title h2 {
          margin: 0;
          letter-spacing: -0.03em;
          font-size: 22px;
          line-height: 1.2;
        }

        .topbar-title p {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 13px;
        }

        .topbar-title p span {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(25, 73, 203, 0.06);
        }

        .hero-actions {
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .toolbar-toggle {
          min-height: 42px;
          padding: 0 14px;
          border-radius: 999px;
        }

        .quick-preview-button {
          min-width: 132px;
        }

        .report-tooltray {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(215, 221, 234, 0.9);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.82);
        }

        .tooltray-warning {
          display: grid;
          gap: 4px;
          min-width: min(320px, 100%);
          padding: 10px 12px;
          border-radius: 14px;
          background: #fff8ed;
          border: 1px solid #efd9af;
          color: #8a4b14;
        }

        .tooltray-warning strong,
        .tooltray-warning span,
        .tooltray-warning em {
          margin: 0;
        }

        .tooltray-warning strong {
          font-size: 13px;
        }

        .tooltray-warning span {
          font-size: 12px;
          line-height: 1.5;
        }

        .tooltray-warning em {
          font-size: 12px;
          line-height: 1.5;
          font-style: normal;
          color: #7a4a13;
        }

        .preview-action-group {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .preview-action-status {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(138, 75, 20, 0.08);
          color: #8a4b14;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .field span {
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
        }

        .field.compact {
          min-width: 132px;
        }

        .field input,
        .field select,
        .composer {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          background: var(--paper-strong);
          color: var(--text);
          padding: 12px 14px;
          outline: none;
        }

        .composer {
          min-height: 180px;
          resize: vertical;
          line-height: 1.6;
        }

        .primary-button,
        .secondary-button,
        .ghost-button,
        .case-card,
        .secondary-link {
          border: 0;
          cursor: pointer;
          transition: transform 150ms ease, opacity 150ms ease, border-color 150ms ease;
        }

        .primary-button,
        .secondary-button,
        .ghost-button,
        .secondary-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 16px;
          border-radius: 14px;
        }

        .primary-button {
          background: linear-gradient(135deg, #1844c7, #2c63ff);
          color: white;
          font-weight: 700;
        }

        .secondary-button,
        .secondary-link {
          background: #f5f8ff;
          color: var(--brand);
          border: 1px solid rgba(25, 73, 203, 0.14);
        }

        .ghost-button {
          background: rgba(24, 68, 199, 0.08);
          color: var(--brand);
        }

        .primary-button:disabled,
        .secondary-button:disabled,
        .ghost-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .case-list,
        .stage-grid {
          display: grid;
          gap: 10px;
        }

        .sidebar-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .sidebar-mini-button {
          min-height: 42px;
          padding: 0 14px;
          border-radius: 999px;
        }

        .create-drawer {
          display: grid;
          gap: 12px;
          padding: 12px;
          border: 1px solid rgba(215, 221, 234, 0.9);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.7);
        }

        .case-list {
          overflow: auto;
          padding-right: 2px;
        }

        .case-card {
          text-align: left;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid transparent;
          border-radius: var(--radius-lg);
          padding: 14px;
        }

        .case-card.active {
          border-color: rgba(25, 73, 203, 0.22);
          background: #f7faff;
        }

        .case-title {
          font-weight: 700;
          margin-bottom: 6px;
        }

        .case-meta,
        .preview-meta {
          color: var(--muted);
          font-size: 13px;
        }

        .summary-strip {
          min-width: 0;
          opacity: 0.92;
        }

        .summary-grid {
          display: flex;
          gap: 8px;
          overflow: auto;
          padding-bottom: 2px;
        }

        .summary-card {
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          padding: 8px 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          flex: 0 0 auto;
        }

        .summary-card span {
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
        }

        .summary-card strong {
          font-size: 13px;
          line-height: 1.4;
        }

        .summary-card-signal {
          color: var(--brand);
          background: #f7faff;
        }

        .summary-card-gap {
          background: #fff8ed;
          border-color: #efd9af;
        }

        .conversation-feed {
          display: grid;
          gap: 14px;
          min-height: 0;
          flex: 1;
          overflow: auto;
          padding: 4px 4px 12px 0;
        }

        .message-card {
          display: grid;
          gap: 10px;
          padding: 18px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.95);
        }

        .message-user {
          background: linear-gradient(135deg, #eff4ff, #f7faff);
          border-color: rgba(25, 73, 203, 0.16);
        }

        .message-assistant {
          background: #ffffff;
        }

        .message-empty {
          min-height: 180px;
          align-content: center;
        }

        .message-empty h3,
        .stage-focus-card h3 {
          margin: 0;
          font-size: 24px;
          line-height: 1.3;
        }

        .message-empty p,
        .stage-focus-card p,
        .message-content {
          margin: 0;
          line-height: 1.75;
          white-space: pre-wrap;
        }

        .message-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--muted);
          font-size: 12px;
        }

        .message-role {
          font-weight: 700;
          color: var(--brand);
        }

        .stage-focus-card {
          gap: 16px;
          border-color: rgba(25, 73, 203, 0.18);
          box-shadow: inset 0 0 0 1px rgba(25, 73, 203, 0.05);
        }

        .copilot-brief {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .rebuild-review-card {
          display: grid;
          gap: 12px;
          padding: 14px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255, 248, 237, 0.96), rgba(255, 244, 226, 0.94));
          border: 1px solid #efd9af;
        }

        .rebuild-review-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .rebuild-review-head strong {
          font-size: 15px;
          color: #8a4b14;
        }

        .rebuild-review-head span {
          font-size: 12px;
          color: #a5661b;
          font-weight: 700;
        }

        .rebuild-review-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .rebuild-review-item {
          display: grid;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(239, 217, 175, 0.9);
        }

        .rebuild-review-item p {
          margin: 0;
          line-height: 1.65;
          color: var(--text);
        }

        .copilot-brief-item {
          display: grid;
          gap: 8px;
          padding: 14px;
          border: 1px solid rgba(215, 221, 234, 0.9);
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(248, 250, 255, 0.92), rgba(241, 245, 255, 0.9));
          min-width: 0;
        }

        .copilot-brief-item p {
          margin: 0;
          line-height: 1.65;
          color: var(--text);
        }

        .copilot-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .copilot-panel {
          display: grid;
          gap: 8px;
          padding: 14px;
          border: 1px solid rgba(215, 221, 234, 0.9);
          border-radius: 16px;
          background: rgba(248, 250, 254, 0.9);
          min-width: 0;
        }

        .copilot-label {
          font-size: 12px;
          line-height: 1.4;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: var(--brand);
        }

        .copilot-panel .list {
          margin: 0;
        }

        .copilot-empty,
        .copilot-next {
          margin: 0;
          line-height: 1.7;
          color: var(--text);
        }

        .stage-rail-wrap {
          display: grid;
          gap: 10px;
        }

        .stage-rail {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .stage-toggle {
          justify-self: flex-start;
          min-height: 42px;
          padding: 0 14px;
          border-radius: 999px;
        }

        .stage-pill {
          text-align: left;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #f8fafe;
          padding: 14px 16px;
          min-height: 72px;
          display: grid;
          gap: 4px;
          cursor: pointer;
        }

        .stage-pill span {
          font-weight: 800;
          color: var(--text);
        }

        .stage-pill small {
          color: var(--muted);
        }

        .stage-pill.active {
          border-color: rgba(25, 73, 203, 0.28);
          background: #eef4ff;
        }

        .stage-pill.locked {
          background: #f3fbf8;
          border-color: rgba(17, 116, 91, 0.16);
        }

        .stage-pill.impacted {
          background: #fff8ed;
          border-color: #efd9af;
        }

        .stage-inline-card {
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          background: var(--paper-strong);
          padding: 16px;
          display: grid;
          gap: 12px;
        }

        .stage-inline-impacted {
          background: #fff8ed;
          border-color: #efd9af;
        }

        .compact-list {
          margin-top: -4px;
        }

        .list {
          margin: 0;
          padding-left: 18px;
          line-height: 1.7;
        }

        .stage-current {
          border-color: rgba(25, 73, 203, 0.24);
          box-shadow: inset 0 0 0 1px rgba(25, 73, 203, 0.08);
        }

        .stage-impacted {
          background: #fff8ed;
          border-color: #efd9af;
        }

        .mini-note,
        .alert {
          padding: 12px 14px;
          border-radius: var(--radius-md);
          line-height: 1.6;
        }

        .inline-alert {
          padding: 12px 14px;
          border-radius: var(--radius-md);
          line-height: 1.6;
          background: #fff8ed;
          color: #8a4b14;
          border: 1px solid #efd9af;
          display: grid;
          gap: 4px;
        }

        .inline-alert strong,
        .inline-alert p {
          margin: 0;
        }

        .mini-note {
          background: rgba(168, 109, 22, 0.08);
          color: var(--warning);
        }

        .alert.error {
          background: rgba(176, 68, 68, 0.08);
          color: var(--danger);
          border: 1px solid rgba(176, 68, 68, 0.12);
        }

        .stage-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .conversation-shell {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
          padding: 12px 14px 14px;
        }

        .conversation-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--muted);
          font-size: 13px;
          padding: 2px 2px 0;
        }

        .composer-shell {
          display: grid;
          gap: 12px;
          position: sticky;
          bottom: 0;
          z-index: 2;
          background: linear-gradient(180deg, rgba(237, 241, 247, 0), rgba(237, 241, 247, 0.9) 18%, rgba(237, 241, 247, 1) 42%);
          padding-top: 10px;
          margin-top: auto;
        }

        .helper-inline {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.6;
        }

        .composer-shell .toolbar {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(215, 221, 234, 0.9);
          border-radius: 18px;
          padding: 10px 12px;
        }

        .composer {
          min-height: 132px;
          border-radius: 22px;
          border-color: rgba(197, 207, 223, 0.95);
          box-shadow: 0 10px 30px rgba(24, 32, 44, 0.06);
        }

        .preview-shell {
          margin-bottom: 6px;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 18px;
        }

        .text-preview,
        .html-preview {
          margin: 0;
          min-height: 580px;
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          background: white;
        }

        .text-preview {
          padding: 18px;
          overflow: auto;
          white-space: pre-wrap;
          line-height: 1.7;
        }

        .html-preview {
          width: 100%;
        }

        @media (max-width: 1280px) {
          .preview-grid {
            grid-template-columns: 1fr;
          }

          .rebuild-review-grid,
          .copilot-brief,
          .copilot-grid,
          .stage-rail {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 960px) {
          .workspace-shell {
            grid-template-columns: 1fr;
            height: auto;
            overflow: visible;
          }

          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .rebuild-review-grid,
          .copilot-brief,
          .copilot-grid,
          .stage-rail {
            grid-template-columns: 1fr;
          }

          .main-panel {
            grid-template-rows: auto auto minmax(520px, 1fr);
          }

          .onboarding-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
