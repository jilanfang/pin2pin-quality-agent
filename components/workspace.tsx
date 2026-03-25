"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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

type AnalysisSummary = {
  title: string;
  overview: string;
  confirmedFacts: string[];
  openQuestions: string[];
  risks: string[];
};

type ActionPlan = {
  title: string;
  overview: string;
  immediateActions: string[];
  owners: string[];
  verificationChecks: string[];
};

type ResultReadiness = {
  analysisSummary: boolean;
  actionPlan: boolean;
  eightD: boolean;
};

type ResultRecommendation = {
  kind: "analysis_summary" | "action_plan" | "eight_d";
  title: string;
  rationale: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  deferActionLabel?: string;
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
  analysisSummary: AnalysisSummary;
  actionPlan: ActionPlan | null;
  resultReadiness: ResultReadiness;
  resultRecommendation: ResultRecommendation;
};

type ReportPreview = {
  document: {
    artifactKind?: string;
    reportStage?: string;
    styleMode?: string;
    title?: string;
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

type FeedbackCategory = "hard_to_understand" | "not_professional_enough" | "bug" | "other";
type TelemetryMetadata = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    __AI_QUALITY_ENABLE_TEST_TELEMETRY__?: boolean;
  }
}

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

const feedbackCategoryOptions: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "hard_to_understand", label: "看不懂" },
  { value: "not_professional_enough", label: "结果不专业" },
  { value: "bug", label: "报错" },
  { value: "other", label: "其他" },
];

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STAGE_LABELS: Record<string, string> = {
  D1: "D1 团队与分工",
  D2: "D2 问题定义",
  D3: "D3 临时遏制",
  D4: "D4 原因分析",
  D5: "D5 纠正措施",
  D6: "D6 效果验证",
  D7: "D7 防再发",
  D8: "D8 结案沉淀",
};

async function readJson(response: Response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(payload.error || "请求失败");
  }
  return response.json();
}

function stageLabel(stage?: string) {
  if (!stage) return "未开始";
  return STAGE_LABELS[stage] ?? stage;
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
    currentCase.resultReadiness.eightD || hasD4 ? "原因链已成形" : "原因链待收口";
  const actionLayerLabel =
    currentCase.resultReadiness.eightD || hasActionLayers
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

function hasActionFact(
  item: [string, string | undefined]
): item is [string, string] {
  return Boolean(item[1]);
}

function WorkspaceContextHeader({
  currentCaseId,
  currentCase,
  impactedStageNames,
}: {
  currentCaseId: string | null;
  currentCase: CaseWorkflow | null;
  impactedStageNames: string[];
}) {
  return (
    <header className="workspace-context" aria-label="案件上下文">
      <div className="workspace-context-main">
        <div className="workspace-context-copy">
          <strong>Fireline Workspace</strong>
          <span className="workspace-context-meta">
            {currentCaseId ? `ACTIVE CASE #${currentCaseId.toUpperCase()}` : "ACTIVE CASE NOT INITIALIZED"}
          </span>
          <h2>{currentCase?.title ?? "先跑通第一单"}</h2>
          <p>
            {currentCaseId
              ? currentCase?.guidedThinking?.thinkingGoal ?? "继续补证据，再让 AI 带着往前推。"
              : "先选一个开始方式，我再带着你把第一单跑通。"}
          </p>
        </div>

        <div className="workspace-track-block">
          <div className="workspace-stage-dots" aria-hidden="true">
            {(currentCase?.stages ?? []).map((stage) => {
              const stageIndex = Number(stage.stage.replace("D", ""));
              const currentIndex = Number((currentCase?.currentStage ?? "D1").replace("D", ""));
              const isActive = stage.stage === currentCase?.currentStage;
              const isComplete = stageIndex < currentIndex;

              return (
                <span
                  key={stage.stage}
                  className={`workspace-stage-dot${isActive ? " active" : ""}${isComplete ? " complete" : ""}${
                    stage.impacted ? " impacted" : ""
                  }`}
                />
              );
            })}
          </div>
          <span className="workspace-track-label">
            {currentCaseId ? stageLabel(currentCase?.currentStage ?? "D2") : stageLabel("D1")}
          </span>
        </div>
      </div>

      <div className="topbar-chips">
        {currentCaseId ? (
          <>
            <span className="status-chip">{stageLabel(currentCase?.currentStage ?? "D2")}</span>
            <span className="status-chip">{caseStatusLabel(currentCase?.status)}</span>
            <span className="status-chip">{`D1 ${d1StatusLabel(currentCase?.d1Status)}`}</span>
            {impactedStageNames.length ? (
              <span className="status-chip status-chip-warning">{`回看 ${impactedStageNames.map(stageLabel).join(" / ")}`}</span>
            ) : null}
          </>
        ) : (
          <>
            <span className="status-chip">未开始</span>
            <span className="status-chip">先创建或载入案件</span>
          </>
        )}
      </div>
    </header>
  );
}

function AssistantStageCard({
  currentCase,
  selectedStage,
  summaryItems,
  impactSummary,
  rebuildReviewCard,
  copilotBrief,
  guidanceFactsList,
  guidanceAssumptions,
  nextQuestion,
  isUrgentComplaint,
  actionFacts,
  resultRecommendation,
  expertReviewSnapshot,
  visibleStages,
  isStageRailExpanded,
  loading,
  onToggleStageRail,
  onSelectStage,
  onConfirmStage,
  onPrimaryRecommendation,
  onSecondaryRecommendation,
}: {
  currentCase: CaseWorkflow | null;
  selectedStage: StageRecord | null;
  summaryItems: SummaryItem[];
  impactSummary: string | null;
  rebuildReviewCard: RebuildReviewCard | null;
  copilotBrief: CopilotBrief | null;
  guidanceFactsList: { field: string; value: string }[];
  guidanceAssumptions: { statement: string; needsValidation: boolean }[];
  nextQuestion: string | null;
  isUrgentComplaint: boolean;
  actionFacts: Array<[string, string | undefined]>;
  resultRecommendation: ResultRecommendation | null;
  expertReviewSnapshot: ExpertReviewSnapshot | null;
  visibleStages: StageRecord[];
  isStageRailExpanded: boolean;
  loading: boolean;
  onToggleStageRail: () => void;
  onSelectStage: (stage: string) => void;
  onConfirmStage: (stage: string) => void;
  onPrimaryRecommendation: () => void;
  onSecondaryRecommendation: () => void;
}) {
  return (
    <article className="message-card message-assistant stage-focus-card" aria-label="AI 主分析卡">
      <div className="message-meta">
        <span className="message-role">当前阶段</span>
        <span>{stageLabel(selectedStage?.stage ?? currentCase?.currentStage ?? "D2")}</span>
      </div>
      {summaryItems.length ? (
        <div className="inline-summary">
          {summaryItems.map((item) => (
            <div
              key={item.key}
              className={`summary-chip${
                item.tone === "signal"
                  ? " summary-chip-signal"
                  : item.tone === "warning"
                    ? " summary-chip-warning"
                    : ""
              }`}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {impactSummary ? (
        <div className="inline-alert" role="status">
          <strong>案件认知已变化</strong>
          <p>{impactSummary}</p>
        </div>
      ) : null}
      <div className="assistant-manuscript">
        <div className="assistant-manuscript-head">
          <span className="section-label">Assistant Brief</span>
          <span className="assistant-manuscript-stage">
            {stageLabel(selectedStage?.stage ?? currentCase?.currentStage ?? "D2")}
          </span>
        </div>
        {copilotBrief ? (
          <div className="assistant-prose" data-testid="copilot-brief">
            <p>
              <span className="copilot-label">我现在怎么看</span>
              <span className="assistant-lead assistant-lead-inline">{copilotBrief.currentView}</span>
            </p>
            <p>
              <span className="copilot-label">为什么先问这个</span>
              {copilotBrief.whyThis}
            </p>
            <p>
              <span className="copilot-label">你只需要补什么</span>
              {copilotBrief.nextNeed}
            </p>
          </div>
        ) : (
          <div className="assistant-prose">
            <p className="assistant-lead">
              {currentCase?.guidedThinking?.thinkingGoal ?? "发送第一条证据后，我会在这里持续推进。"}
            </p>
            <p>{currentCase?.guidedThinking?.guidanceText ?? "先补事实，再进入分析。"}</p>
          </div>
        )}
      </div>
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
      <div className="copilot-grid">
        <section className="copilot-panel copilot-panel-primary">
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

        {resultRecommendation ? (
          <section className="copilot-panel">
            <span className="copilot-label">当前建议整理</span>
            <p className="copilot-next">
              {resultRecommendation.kind === "analysis_summary"
                ? "分析结论"
                : resultRecommendation.kind === "action_plan"
                  ? "行动方案"
                  : "8D"}
            </p>
            <div className="mini-note">{resultRecommendation.rationale}</div>
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

      <div className="timeline-wrap">
        <div className="timeline-head">
          <span className="section-label">阶段时间线</span>
          <button className="ghost-button ghost-button-tight" type="button" onClick={onToggleStageRail}>
            {isStageRailExpanded ? "收起阶段" : "展开全部阶段"}
          </button>
        </div>
        <div className="stage-timeline" data-testid="stage-timeline">
          {visibleStages.map((stage) => (
            <button
              key={stage.stage}
              type="button"
              className={`stage-node${stage.stage === selectedStage?.stage ? " active" : ""}${stage.locked ? " locked" : ""}${
                stage.impacted ? " impacted" : ""
              }`}
              onClick={() => onSelectStage(stage.stage)}
            >
              <span>{stageLabel(stage.stage)}</span>
              <small>{stage.impacted ? "受影响" : stage.locked ? "已确认" : "工作稿"}</small>
            </button>
          ))}
        </div>
      </div>

      {selectedStage ? (
        <div className={`stage-detail-card${selectedStage.impacted ? " stage-detail-impacted" : ""}`}>
          <div className="stage-head">
            <strong>
              {stageLabel(selectedStage.stage)} {selectedStage.stage === currentCase?.currentStage ? "· 当前聚焦" : ""}
            </strong>
            <span>{selectedStage.impacted ? "需要回看" : selectedStage.locked ? "已确认" : "工作稿"}</span>
          </div>
          <p>{stageCardPreview(selectedStage)}</p>
          {selectedStage.impactSummary ? <div className="mini-note">{selectedStage.impactSummary}</div> : null}
          {selectedStage.stage === currentCase?.currentStage ? (
            <div className="stage-footnote">
              <button
                className="ghost-button ghost-button-tight"
                type="button"
                onClick={() => onConfirmStage(selectedStage.stage)}
                disabled={loading}
              >
                确认当前阶段
              </button>
              <span>不再用解锁 / 复审按钮驱动，变化会直接在会话里解释。</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {resultRecommendation ? (
        <div className="report-action-card" data-testid="result-recommendation-card">
          <div className="report-action-copy">
            <span className="section-label">AI 建议卡</span>
            <p className="report-action-lead">{resultRecommendation.title}</p>
            <p>{resultRecommendation.rationale}</p>
          </div>
          <div className="report-action-row report-action-row-inline">
            <button
              className="primary-button"
              type="button"
              onClick={onPrimaryRecommendation}
              disabled={loading}
            >
              {resultRecommendation.primaryActionLabel}
            </button>
            {resultRecommendation.secondaryActionLabel ? (
              <button
                className="secondary-button"
                type="button"
                onClick={onSecondaryRecommendation}
                disabled={loading}
              >
                {resultRecommendation.secondaryActionLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ComposerDock({
  focusArea,
  composer,
  isExpanded,
  loading,
  currentCaseId,
  onChange,
  onToggleExpanded,
  onSend,
}: {
  focusArea: string | null | undefined;
  composer: string;
  isExpanded: boolean;
  loading: boolean;
  currentCaseId: string | null;
  onChange: (value: string) => void;
  onToggleExpanded: () => void;
  onSend: () => void;
}) {
  return (
    <div
      className={`composer-dock${isExpanded ? " expanded" : ""}`}
      data-testid="composer-dock"
      aria-label="证据输入停靠区"
    >
      <span className="helper-inline">
        {focusArea ? `当前建议先推进 ${focusArea}` : "先创建案件，再开始输入证据"}
      </span>
      <div className="composer-frame">
        <textarea
          aria-label="证据输入框"
          className="composer"
          rows={isExpanded ? 4 : 1}
          placeholder="输入客户投诉、测试结论、批次、工单、现场观察，系统会按当前阶段推进。"
          value={composer}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="composer-actions">
          <button className="ghost-button ghost-button-tight" type="button" onClick={onToggleExpanded}>
            {isExpanded ? "收起输入框" : "展开输入框"}
          </button>
          <button className="primary-button" type="button" onClick={onSend} disabled={!composer.trim() || loading || !currentCaseId}>
            发送证据
          </button>
        </div>
      </div>
    </div>
  );
}

export function Workspace() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [currentCase, setCurrentCase] = useState<CaseWorkflow | null>(null);
  const [composer, setComposer] = useState("");
  const [titleInput, setTitleInput] = useState("新的 8D 案件");
  const [seedCase, setSeedCase] = useState<(typeof seedCases)[number]["key"] | "">("");
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedStage, setFocusedStage] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCaseDrawerOpen, setIsCaseDrawerOpen] = useState(false);
  const [isStageRailExpanded, setIsStageRailExpanded] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("hard_to_understand");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const hasTrackedOpenRef = useRef(false);
  const lastTrackedErrorRef = useRef<string | null>(null);

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
    return orderedFacts(currentCase.knownFacts)
      .filter((item) => item.field !== "mode" && item.field !== "severity")
      .slice(0, 2);
  }, [currentCase]);

  const guidanceFactsList = useMemo(() => (currentCase ? guidanceFacts(currentCase.knownFacts) : []), [currentCase]);
  const guidanceAssumptions = useMemo(
    () => currentCase?.assumptions.filter((item) => item.needsValidation).slice(0, 2) ?? [],
    [currentCase]
  );
  const nextQuestion = currentCase?.guidedThinking?.suggestedQuestions[0] ?? null;
  const isUrgentComplaint =
    factValue(currentCase?.knownFacts ?? [], "mode") === "customer_complaint_urgent";
  const resultRecommendation = currentCase?.resultRecommendation ?? null;
  const expertReviewSnapshot = buildExpertReviewSnapshot(currentCase);
  const impactSummary = currentImpactSummary(currentCase);
  const copilotBrief = buildCopilotBrief(currentCase, nextQuestion, isUrgentComplaint);
  const rebuildReviewCard = buildRebuildReviewCard(currentCase);
  const impactedStageNames = useMemo(
    () => currentCase?.stages.filter((stage) => stage.impacted).map((stage) => stage.stage) ?? [],
    [currentCase]
  );
  const actionFactEntries: Array<[string, string | undefined]> = [
    ["客户现场", factValue(currentCase?.knownFacts ?? [], "containment_customer_site")],
    ["已发货", factValue(currentCase?.knownFacts ?? [], "containment_shipped")],
    ["成品库存", factValue(currentCase?.knownFacts ?? [], "containment_stock")],
    ["在制品", factValue(currentCase?.knownFacts ?? [], "containment_wip")],
  ];
  const actionFacts = actionFactEntries.filter(hasActionFact);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    if (!currentCase) return [];

    return [
      ...(impactedStageNames.length
        ? [
            {
              key: "revisit",
              label: "受影响",
              value: impactedStageNames.map(stageLabel).join(" / "),
              tone: "warning" as const,
            },
          ]
        : []),
      ...(resultRecommendation
        ? [
            {
              key: "output",
              label: "当前建议",
              value:
                resultRecommendation.kind === "analysis_summary"
                  ? "分析结论"
                  : resultRecommendation.kind === "action_plan"
                    ? "行动方案"
                    : "8D",
              tone: "signal" as const,
            },
          ]
        : []),
      ...(!currentCase.resultReadiness.actionPlan
        ? [
            {
              key: "formal-gap",
              label: "当前还缺",
              value: currentCase.missingFields.slice(0, 2).map((item) => item.reason).join("；") || "继续补证据",
              tone: "warning" as const,
            },
          ]
        : !currentCase.resultReadiness.eightD
          ? [
              {
                key: "final-gap",
                label: "8D 前还缺",
                value:
                  impactedStageNames.length > 0
                    ? `先回看 ${impactedStageNames.map(stageLabel).join(" / ")}`
                    : "仍有阶段未确认",
                tone: "warning" as const,
              },
            ]
          : []),
      ...summaryFacts.map((item) => ({
        key: `fact-${item.field}`,
        label: factLabel(item.field),
        value: item.value,
        tone: "default" as const,
      })),
    ];
  }, [currentCase, impactedStageNames, resultRecommendation, summaryFacts]);

  const visibleStages = useMemo(() => {
    if (!currentCase) return [];
    if (isStageRailExpanded) return currentCase.stages;
    const target = selectedStage?.stage ?? currentCase.currentStage;
    return currentCase.stages.filter((stage) => stage.stage === target || stage.impacted);
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

  function shouldTrackClientTelemetry() {
    if (typeof window === "undefined") return false;
    if (process.env.NODE_ENV !== "test") return true;
    return window.__AI_QUALITY_ENABLE_TEST_TELEMETRY__ === true;
  }

  async function postClientTelemetry(name: string, metadata?: TelemetryMetadata) {
    if (!shouldTrackClientTelemetry()) return;

    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          caseId: currentCaseId,
          metadata,
        }),
      });
    } catch {
      // Telemetry should not interrupt the user flow.
    }
  }

  useEffect(() => {
    void refreshCases();
  }, []);

  useEffect(() => {
    if (!currentCaseId) return;
    void refreshCurrentCase(currentCaseId);
  }, [currentCaseId]);

  useEffect(() => {
    if (hasTrackedOpenRef.current) return;
    hasTrackedOpenRef.current = true;
    void postClientTelemetry("workspace_opened", { source: "workspace" });
  }, []);

  useEffect(() => {
    if (!error || lastTrackedErrorRef.current === error) return;
    lastTrackedErrorRef.current = error;
    void postClientTelemetry("app_error", {
      message: error,
      hasCase: Boolean(currentCaseId),
    });
  }, [currentCaseId, error]);

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
      setIsCaseDrawerOpen(false);
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
      setIsComposerExpanded(false);
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

  function artifactForRecommendation(kind: ResultRecommendation["kind"] | undefined) {
    if (kind === "action_plan") return "action_plan";
    if (kind === "eight_d") return "eight_d";
    return "analysis_summary";
  }

  async function openPreview(artifact?: "analysis_summary" | "action_plan" | "eight_d") {
    if (!currentCaseId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await readJson(
        await fetch(`/api/cases/${currentCaseId}/report-preview?artifact=${artifact ?? "analysis_summary"}`)
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
        await fetch(`/api/cases/${currentCaseId}/report?artifact=eight_d`, {
          method: "POST",
        })
      )) as CaseWorkflow;
      setCurrentCase(payload);
      await refreshCases(currentCaseId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "生成完整 8D 失败");
    } finally {
      setLoading(false);
    }
  }

  function keepCollectingEvidence() {
    setPreview(null);
    setIsComposerExpanded(true);
  }

  async function submitFeedback() {
    setIsFeedbackSubmitting(true);
    setFeedbackStatus(null);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: feedbackCategory,
          caseId: currentCaseId,
          note: feedbackNote.trim() || undefined,
        }),
      });
      setFeedbackStatus("已收到反馈");
      setFeedbackNote("");
      setIsFeedbackOpen(false);
    } catch {
      setFeedbackStatus("反馈提交失败，请稍后重试");
    } finally {
      setIsFeedbackSubmitting(false);
    }
  }

  const currentSeedDescription = seedCases.find((item) => item.key === seedCase)?.description;
  const hasCases = cases.length > 0;

  function startWithSeedCase(defaultSeedCase: (typeof seedCases)[number]["key"]) {
    setSeedCase(defaultSeedCase);
    setIsCreateOpen(true);
    setIsCaseDrawerOpen(true);
  }

  function startWithBlankCase() {
    setSeedCase("");
    setIsCreateOpen(true);
    setIsCaseDrawerOpen(true);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleToggleCaseDrawer() {
      setIsCaseDrawerOpen((value) => !value);
    }

    function handleStartBlankCase() {
      startWithBlankCase();
    }

    function handleOpenReportDrawer() {
      if (!preview && !loading && currentCaseId) {
        void openPreview();
      }
    }

    window.addEventListener("fireline:toggle-case-drawer", handleToggleCaseDrawer);
    window.addEventListener("fireline:start-blank-case", handleStartBlankCase);
    window.addEventListener("fireline:open-report-drawer", handleOpenReportDrawer);

    return () => {
      window.removeEventListener("fireline:toggle-case-drawer", handleToggleCaseDrawer);
      window.removeEventListener("fireline:start-blank-case", handleStartBlankCase);
      window.removeEventListener("fireline:open-report-drawer", handleOpenReportDrawer);
    };
  }, [currentCaseId, loading, preview]);

  return (
    <div className="workspace-shell">
      {isCaseDrawerOpen ? <button className="drawer-scrim" type="button" aria-label="关闭抽屉遮罩" onClick={() => setIsCaseDrawerOpen(false)} /> : null}

      {isCaseDrawerOpen ? (
        <section className="case-drawer panel" aria-label="案件抽屉">
          <div className="drawer-head">
            <div className="drawer-copy">
              <strong>案件抽屉</strong>
              <span>缩起来只留主会话，展开时再切案件或新建。</span>
            </div>
            <button className="ghost-button ghost-button-tight" type="button" onClick={() => setIsCaseDrawerOpen(false)}>
              收起案件抽屉
            </button>
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

          <div className="drawer-tools">
            <div className="drawer-tools-copy">
              <strong>案件列表</strong>
              <span>{`${cases.length} 个案件`}</span>
            </div>
            <button
              className="ghost-button ghost-button-tight"
              type="button"
              onClick={() => {
                setSeedCase("");
                setIsCreateOpen((value) => !value);
              }}
            >
              {isCreateOpen ? "收起新建" : "新建案件"}
            </button>
          </div>

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
                onClick={() => {
                  setCurrentCaseId(item.id);
                  setIsCaseDrawerOpen(false);
                }}
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
      ) : null}

      <main className="main-panel">
        <WorkspaceContextHeader
          currentCaseId={currentCaseId}
          currentCase={currentCase}
          impactedStageNames={impactedStageNames}
        />

        {error ? <div className="alert error">{error}</div> : null}

        <section className="conversation-shell panel">
          <div className="conversation-head">
            <strong>AI 协作区</strong>
            <span>{loading ? "处理中…" : currentCaseId ? "会话主舞台" : "先选开始方式，再录入第一条证据"}</span>
          </div>

          <div className="conversation-feed">
            {!currentCaseId ? (
              <article className="message-card message-assistant message-empty">
                <span className="message-role">AI 协作</span>
                <h3>先跑通第一单，再继续补证据和出稿。</h3>
                <p>
                  先选一个开始方式，我再带着你把第一单跑通。
                </p>
                <p>
                  推荐先加载一个种子案例，3 分钟内看到第一版结果。也可以直接录入真实异常，随后把客户投诉、测试结论、批次工单或现场观察发进来，我会继续往前推进。
                </p>
                <div className="empty-actions">
                  <button className="primary-button" type="button" onClick={() => startWithSeedCase(seedCases[0].key)}>
                    从种子案例开始
                  </button>
                  <button className="ghost-button" type="button" onClick={startWithBlankCase}>
                    新建空白案件
                  </button>
                </div>
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

                <AssistantStageCard
                  currentCase={currentCase}
                  selectedStage={selectedStage}
                  summaryItems={summaryItems}
                  impactSummary={impactSummary}
                  rebuildReviewCard={rebuildReviewCard}
                  copilotBrief={copilotBrief}
                  guidanceFactsList={guidanceFactsList}
                  guidanceAssumptions={guidanceAssumptions}
                  nextQuestion={nextQuestion}
                  isUrgentComplaint={isUrgentComplaint}
                  actionFacts={actionFacts}
                  resultRecommendation={resultRecommendation}
                  expertReviewSnapshot={expertReviewSnapshot}
                  visibleStages={visibleStages}
                  isStageRailExpanded={isStageRailExpanded}
                  loading={loading}
                  onToggleStageRail={() => setIsStageRailExpanded((value) => !value)}
                  onSelectStage={setFocusedStage}
                  onConfirmStage={(stage) => void stageAction(stage, "confirm")}
                  onPrimaryRecommendation={() => {
                    if (resultRecommendation?.kind === "eight_d") {
                      void closeCaseWithFinalReport();
                      return;
                    }
                    void openPreview(artifactForRecommendation(resultRecommendation?.kind));
                  }}
                  onSecondaryRecommendation={keepCollectingEvidence}
                />
              </>
            )}
          </div>

          <ComposerDock
            focusArea={currentCase?.guidedThinking?.focusArea}
            composer={composer}
            isExpanded={isComposerExpanded}
            loading={loading}
            currentCaseId={currentCaseId}
            onChange={setComposer}
            onToggleExpanded={() => setIsComposerExpanded((value) => !value)}
            onSend={() => void sendEvidence()}
          />
        </section>

        {preview ? (
          <aside className="preview-drawer panel" data-testid="preview-drawer" aria-label="报告预览抽屉">
            <div className="drawer-head">
              <div className="drawer-copy">
                <strong>结果预览</strong>
                <span>默认折叠，只有在需要查看整理结果时才展开。</span>
              </div>
              <button className="ghost-button ghost-button-tight" type="button" onClick={() => setPreview(null)}>
                关闭预览
              </button>
            </div>
            <div className="panel-head">
              <strong>{preview.document.title ?? "HTML 预览"}</strong>
            </div>
            <div className="preview-meta">
              <span>类型：{preview.document.artifactKind ?? preview.document.reportStage ?? "analysis_summary"}</span>
              <span>状态：{preview.document.caseStatus}</span>
            </div>
            <div className="preview-body">
              <iframe
                className="html-preview"
                title={preview.document.title ? `${preview.document.title}预览` : "分析结论预览"}
                srcDoc={preview.html}
              />
              <details className="text-preview-wrap">
                <summary>查看文本预览</summary>
                <pre className="text-preview">{preview.text}</pre>
              </details>
            </div>
          </aside>
        ) : null}
      </main>

      <div className="feedback-dock">
        <button
          className="secondary-button feedback-trigger"
          type="button"
          onClick={() => {
            setFeedbackStatus(null);
            setIsFeedbackOpen((value) => !value);
          }}
        >
          反馈
        </button>
        {isFeedbackOpen ? (
          <section className="feedback-panel panel" aria-label="试用反馈">
            <div className="panel-head">
              <strong>试用反馈</strong>
              <span>1 分钟说清问题</span>
            </div>
            <label className="field">
              <span>问题分类</span>
              <select
                aria-label="问题分类"
                value={feedbackCategory}
                onChange={(event) => setFeedbackCategory(event.target.value as FeedbackCategory)}
              >
                {feedbackCategoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>补充说明</span>
              <textarea
                aria-label="补充说明"
                rows={4}
                placeholder="哪一步让你卡住了，或者哪里不够专业？"
                value={feedbackNote}
                onChange={(event) => setFeedbackNote(event.target.value)}
              />
            </label>
            <div className="feedback-actions">
              <button
                className="primary-button"
                type="button"
                onClick={submitFeedback}
                disabled={isFeedbackSubmitting}
              >
                提交反馈
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                disabled={isFeedbackSubmitting}
              >
                收起
              </button>
            </div>
          </section>
        ) : null}
        {feedbackStatus ? <div className="feedback-status">{feedbackStatus}</div> : null}
      </div>

      <style>{`
        .workspace-shell {
          position: relative;
          display: block;
          height: 100%;
          min-height: 0;
          padding: 0;
          overflow: hidden;
        }

        .main-panel {
          min-width: 0;
          min-height: 0;
        }

        .main-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 1180px;
          width: min(100%, 1180px);
          margin: 0 auto;
        }

        .panel {
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(16px);
          border-radius: 18px;
          box-shadow: var(--shadow);
          padding: 12px;
        }

        .rail-brand,
        .rail-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 52px;
          border-radius: 18px;
          border: 1px solid rgba(215, 221, 234, 0.88);
          background: rgba(255, 255, 255, 0.9);
          color: var(--text);
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
        }

        .rail-brand span {
          font-size: 14px;
          letter-spacing: 0.08em;
        }

        .rail-brand small {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
        }

        .rail-button-muted {
          color: var(--muted);
        }

        .drawer-scrim {
          position: absolute;
          inset: 0;
          border: 0;
          padding: 0;
          background: rgba(16, 24, 40, 0.08);
          cursor: pointer;
          z-index: 10;
        }

        .case-drawer,
        .preview-drawer {
          position: absolute;
          top: 8px;
          bottom: 8px;
          z-index: 20;
          display: grid;
          align-content: start;
          gap: 12px;
          overflow: hidden;
        }

        .case-drawer {
          left: 0;
          width: min(320px, calc(100vw - 148px));
        }

        .preview-drawer {
          right: 0;
          width: min(520px, calc(100vw - 112px));
        }

        .drawer-head,
        .drawer-copy,
        .panel-head,
        .stage-head,
        .report-action-row,
        .preview-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .drawer-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .drawer-copy strong,
        .panel-head strong {
          font-size: 13px;
        }

        .drawer-copy span,
        .panel-head span,
        .helper,
        .helper-inline,
        .case-meta,
        .preview-meta,
        .message-meta {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.55;
          margin: 0;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 8px;
          border-radius: 999px;
          background: var(--brand-soft);
          color: var(--brand);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .first-run-card,
        .message-card,
        .copilot-panel,
        .copilot-brief-item,
        .rebuild-review-item,
        .stage-detail-card,
        .report-action-card {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(215, 221, 234, 0.86);
        }

        .first-run-card {
          background: linear-gradient(180deg, rgba(248, 250, 255, 0.94), rgba(241, 245, 255, 0.92));
        }

        .first-run-card h3,
        .message-empty h3,
        .report-action-copy h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.35;
          letter-spacing: -0.03em;
        }

        .first-run-card p,
        .message-empty p,
        .message-content,
        .stage-detail-card p,
        .copilot-next,
        .copilot-empty,
        .rebuild-review-item p,
        .copilot-brief-item p,
        .report-action-copy p {
          margin: 0;
          line-height: 1.62;
        }

        .first-run-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .workspace-context {
          display: grid;
          gap: 8px;
          padding: 4px 8px 2px;
        }

        .workspace-context-main {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .workspace-context-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .workspace-context-copy strong {
          font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
          font-size: 13px;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: var(--text);
        }

        .workspace-context-copy h2 {
          margin: 0;
          font-size: 16px;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }

        .workspace-context-copy p {
          color: var(--muted);
          font-size: 11px;
          line-height: 1.55;
          margin: 0;
          max-width: 540px;
        }

        .workspace-context-meta,
        .workspace-track-label {
          color: var(--secondary);
          font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .workspace-track-block {
          display: grid;
          justify-items: end;
          gap: 5px;
          flex-shrink: 0;
          padding-top: 2px;
        }

        .workspace-stage-dots {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .workspace-stage-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(136, 115, 100, 0.24);
        }

        .workspace-stage-dot.complete {
          background: var(--secondary);
        }

        .workspace-stage-dot.active {
          background: var(--brand);
        }

        .workspace-stage-dot.impacted {
          background: var(--warning);
        }

        .topbar-chips {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          flex-wrap: wrap;
          padding-top: 2px;
        }

        .status-chip,
        .summary-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          background: rgba(25, 73, 203, 0.06);
          color: var(--text);
          font-size: 10px;
          font-weight: 700;
        }

        .status-chip-warning,
        .summary-chip-warning {
          background: #fff7e8;
          color: #8a4b14;
        }

        .summary-chip-signal {
          background: #f7faff;
          color: var(--brand);
        }

        .summary-chip strong {
          font-size: 12px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .field span {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
        }

        .field.compact {
          min-width: 132px;
        }

        .field input,
        .field select,
        .field textarea,
        .composer {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: var(--paper-strong);
          color: var(--text);
          padding: 9px 11px;
          outline: none;
          font: inherit;
          font-size: 13px;
        }

        .field textarea {
          min-height: 96px;
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
          min-height: 32px;
          padding: 0 11px;
          border-radius: 11px;
          font-size: 11px;
          font-weight: 700;
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

        .ghost-button-tight {
          min-height: 32px;
          padding: 0 10px;
          border-radius: 999px;
        }

        .primary-button:disabled,
        .secondary-button:disabled,
        .ghost-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .drawer-tools {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .drawer-tools-copy {
          display: grid;
          gap: 2px;
        }

        .drawer-tools-copy strong {
          font-size: 13px;
        }

        .drawer-tools-copy span {
          color: var(--muted);
          font-size: 11px;
        }

        .feedback-dock {
          position: fixed;
          right: 12px;
          bottom: 12px;
          display: grid;
          justify-items: end;
          gap: 8px;
          z-index: 20;
        }

        .feedback-trigger {
          min-width: 74px;
          border-radius: 999px;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
        }

        .feedback-panel {
          width: min(340px, calc(100vw - 36px));
          gap: 10px;
          padding: 12px;
          box-shadow: 0 24px 44px rgba(15, 23, 42, 0.16);
        }

        .feedback-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .feedback-status {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(215, 221, 234, 0.95);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
        }

        .create-drawer {
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(215, 221, 234, 0.92);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.7);
        }

        .case-list {
          overflow: auto;
          padding-right: 2px;
          display: grid;
          gap: 8px;
        }

        .case-card {
          text-align: left;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid transparent;
          border-radius: 14px;
          padding: 10px 11px;
        }

        .case-card.active {
          border-color: rgba(25, 73, 203, 0.22);
          background: #f7faff;
        }

        .case-title {
          font-weight: 700;
          margin-bottom: 4px;
        }

        .conversation-feed {
          display: grid;
          gap: 12px;
          min-height: 0;
          flex: 1;
          overflow: auto;
          padding: 8px 0 104px;
          max-width: 760px;
          width: min(100%, 760px);
          margin: 0 auto;
        }

        .message-card {
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 10px 28px rgba(24, 32, 44, 0.035);
        }

        .message-user {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(252, 248, 244, 0.94));
          border-color: rgba(177, 95, 0, 0.22);
          justify-self: end;
          width: min(100%, 430px);
          border-right: 2px solid rgba(177, 95, 0, 0.72);
        }

        .message-assistant {
          background: rgba(255, 255, 255, 0.97);
          justify-self: start;
          width: min(100%, 640px);
        }

        .message-empty {
          min-height: 220px;
          align-content: center;
          width: 100%;
        }

        .message-meta {
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 11px;
        }

        .message-role {
          font-weight: 700;
          color: var(--brand);
          letter-spacing: 0.04em;
          font-size: 10px;
          text-transform: uppercase;
        }

        .message-content {
          white-space: pre-wrap;
        }

        .stage-focus-card {
          gap: 12px;
          width: 100%;
          border-color: rgba(25, 73, 203, 0.1);
          box-shadow: inset 0 0 0 1px rgba(25, 73, 203, 0.04);
        }

        .inline-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .assistant-manuscript {
          display: grid;
          gap: 10px;
          padding: 2px 0 0;
        }

        .assistant-manuscript-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .assistant-manuscript-stage {
          color: var(--secondary);
          font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .assistant-prose {
          display: grid;
          gap: 8px;
          max-width: 620px;
        }

        .assistant-prose p {
          margin: 0;
          line-height: 1.68;
        }

        .assistant-lead {
          font-size: 15px;
          line-height: 1.55;
          color: var(--text);
        }

        .assistant-lead-inline {
          display: block;
          margin-top: 2px;
        }

        .assistant-prose .copilot-label {
          display: block;
          margin-bottom: 2px;
        }

        .rebuild-review-card {
          display: grid;
          gap: 10px;
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
          gap: 8px;
        }

        .rebuild-review-item {
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(239, 217, 175, 0.9);
        }

        .copilot-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .copilot-panel {
          background: rgba(248, 250, 254, 0.7);
          border-style: dashed;
          border-color: rgba(215, 221, 234, 0.72);
          padding-top: 10px;
          padding-bottom: 10px;
        }

        .copilot-panel-primary {
          background: rgba(248, 250, 254, 0.86);
          border-style: solid;
        }

        .copilot-label {
          font-size: 11px;
          line-height: 1.4;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: var(--brand);
        }

        .timeline-wrap {
          display: grid;
          gap: 8px;
          padding-top: 2px;
        }

        .timeline-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .section-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--muted);
          text-transform: uppercase;
        }

        .stage-timeline {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .stage-node {
          text-align: left;
          border: 1px solid rgba(215, 221, 234, 0.76);
          border-radius: 999px;
          background: rgba(248, 250, 254, 0.74);
          padding: 8px 11px;
          display: grid;
          gap: 2px;
          cursor: pointer;
        }

        .stage-node span {
          font-weight: 800;
          color: var(--text);
        }

        .stage-node small {
          color: var(--muted);
          font-size: 11px;
        }

        .stage-node.active {
          border-color: rgba(25, 73, 203, 0.28);
          background: #eef4ff;
        }

        .stage-node.locked {
          background: #f3fbf8;
          border-color: rgba(17, 116, 91, 0.16);
        }

        .stage-node.impacted {
          background: #fff8ed;
          border-color: #efd9af;
        }

        .stage-detail-card {
          background: rgba(255, 255, 255, 0.72);
        }

        .stage-detail-impacted {
          background: #fff8ed;
          border-color: #efd9af;
        }

        .stage-footnote {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          color: var(--muted);
          font-size: 12px;
        }

        .list {
          margin: 0;
          padding-left: 18px;
          line-height: 1.6;
        }

        .mini-note,
        .alert {
          padding: 10px 12px;
          border-radius: 14px;
          line-height: 1.6;
        }

        .inline-alert {
          padding: 10px 12px;
          border-radius: 14px;
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

        .conversation-shell {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 0;
          padding: 10px 12px 8px;
        }

        .conversation-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--muted);
          font-size: 11px;
          padding: 2px 6px 0;
          max-width: 760px;
          width: min(100%, 760px);
          margin: 0 auto;
        }

        .empty-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .report-action-card {
          gap: 10px;
          background: linear-gradient(180deg, rgba(248, 250, 255, 0.66), rgba(255, 255, 255, 0.9));
          border-style: dashed;
          border-color: rgba(219, 194, 176, 0.44);
        }

        .report-action-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .report-action-copy {
          display: grid;
          gap: 4px;
        }

        .report-action-copy p {
          margin: 0;
          line-height: 1.62;
        }

        .report-action-lead {
          font-size: 14px;
          color: var(--text);
        }

        .report-action-row-inline {
          justify-content: flex-start;
          flex-wrap: wrap;
        }

        .composer-dock {
          display: grid;
          gap: 6px;
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 3;
          padding: 0 12px 12px;
          pointer-events: none;
        }

        .composer-frame {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(219, 194, 176, 0.28);
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 10px 24px rgba(24, 32, 44, 0.08);
          max-width: 760px;
          width: min(100%, 760px);
          margin: 0 auto;
          pointer-events: auto;
        }

        .composer-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .composer {
          min-height: 38px;
          border-radius: 12px;
          border-color: rgba(197, 207, 223, 0.72);
          box-shadow: none;
          resize: none;
          padding-top: 8px;
          padding-bottom: 8px;
        }

        .composer-dock.expanded .composer {
          min-height: 104px;
        }

        .helper-inline {
          max-width: 760px;
          width: min(100%, 760px);
          margin: 0 auto;
          padding: 0 4px;
          pointer-events: none;
        }

        .preview-body {
          display: grid;
          gap: 10px;
          min-height: 0;
        }

        .text-preview,
        .html-preview {
          margin: 0;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: white;
        }

        .text-preview-wrap summary {
          cursor: pointer;
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
        }

        .text-preview {
          padding: 14px;
          overflow: auto;
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .html-preview {
          width: 100%;
          min-height: 520px;
        }

        @media (max-width: 1280px) {
          .rebuild-review-grid,
          .copilot-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 960px) {
          .workspace-shell {
            height: auto;
            min-height: 100vh;
            overflow: visible;
          }

          .main-panel {
            min-height: 100vh;
            width: 100%;
          }

          .workspace-context-main {
            align-items: flex-start;
            flex-direction: column;
          }

          .rebuild-review-grid,
          .copilot-grid,
          .report-action-grid {
            grid-template-columns: 1fr;
          }

          .composer-frame,
          .stage-footnote,
          .report-action-row {
            align-items: stretch;
            flex-direction: column;
          }

          .message-user,
          .message-assistant,
          .conversation-feed,
          .conversation-head,
          .composer-frame,
          .helper-inline {
            width: 100%;
            max-width: 100%;
          }

          .case-drawer,
          .preview-drawer {
            left: 12px;
            right: 12px;
            width: auto;
            top: 12px;
            bottom: 12px;
          }

          .feedback-dock {
            right: 12px;
            bottom: 12px;
          }
        }
      `}</style>
    </div>
  );
}
