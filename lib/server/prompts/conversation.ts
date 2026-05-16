import type {
  EvidencePayload,
  FactItem,
} from "@/lib/domain/types";

import type { PromptMessage } from "./types";

const MAX_CONTEXT_FACTS = 12;

export function buildConversationPrompt(
  payload: EvidencePayload,
  options: {
    currentCaseTitle?: string | null;
    currentKnownFacts?: FactItem[];
    hasCurrentCase: boolean;
  }
): PromptMessage[] {
  const currentFacts = (options.currentKnownFacts ?? [])
    .slice(0, MAX_CONTEXT_FACTS)
    .map((item) => `${item.field}: ${item.value}`)
    .join("; ");

  return [
    {
      role: "system",
      content: [
        "你是 Pin2pin Fireline 的调查对话分析器。",
        "任务是把用户本轮输入分析成结构化 JSON，供系统执行。",
        "你不是直接产出 8D 成品，而是判断这轮输入属于什么意图、是否应该挂到当前调查、以及该如何回复。",
        "输出必须是 JSON，不要输出 Markdown，不要解释。",
        "硬性要求：",
        "1. intents 只能用 evidence/question/summary_request/correction/decision_signal。",
        "2. sourceShape 只能用 long_document/fragmented_update/meeting_notes/question_only/mixed_input。",
        "3. caseOperation 只能用 create_new_case/attach_to_current_case/needs_case_confirmation。",
        "4. responseMode 只能用 inform/guide/result_action。",
        "5. thinking.mode 只能用 processing_input/reviewing_prior_judgement/summarizing_case/preparing_artifact。",
        "6. knownFacts 仅放有把握的稳定事实；假设放 assumptions。",
        "7. 如果内容明显属于另一个调查，caseOperation 必须是 needs_case_confirmation。",
        "8. assistantReplyDraft 要用中文，简洁、专业、可执行。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `当前阶段：${payload.contextStage ?? "D2"}`,
        `是否已有当前调查：${options.hasCurrentCase ? "是" : "否"}`,
        `当前调查标题：${options.currentCaseTitle ?? "无"}`,
        `当前调查已知事实：${currentFacts || "无"}`,
        "输出 JSON schema 示例：",
        JSON.stringify({
          intents: ["evidence"],
          sourceShape: "fragmented_update",
          caseOperation: "attach_to_current_case",
          responseMode: "guide",
          thinking: {
            mode: "processing_input",
            steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
          },
          knownFacts: [{ field: "customer", value: "华星科技", confidence: 0.95 }],
          assumptions: [{ statement: "可能与换料有关", needsValidation: true }],
          riskFlags: ["客户停线级异常，需持续复审。"],
          summaryRequested: false,
          assistantReplyDraft: "我先帮你接下这个调查，先确认失效位置和围堵状态。",
          suggestedCaseTitle: "华星科技上电冒烟客诉",
          reasoningNotes: "仅用于内部日志",
        }),
        `用户输入：${payload.content}`,
      ].join("\n"),
    },
  ];
}
