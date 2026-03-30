import {
  detectConversationCaseOperation,
  detectConversationIntents,
  detectConversationSourceShape,
  inferCaseTitleFromInput,
} from "@/lib/domain/conversation-input";
import type { ConversationTurnAnalysis, FactItem, WorkflowStage } from "@/lib/domain/types";

type BuildConversationOptions = {
  content: string;
  contextStage?: WorkflowStage;
  currentCaseTitle?: string | null;
  currentKnownFacts?: FactItem[];
  hasCurrentCase?: boolean;
  knownFacts?: ConversationTurnAnalysis["knownFacts"];
  assumptions?: ConversationTurnAnalysis["assumptions"];
  riskFlags?: string[];
  assistantReplyDraft?: string | null;
};

function inferThinking(intents: ConversationTurnAnalysis["intents"]): ConversationTurnAnalysis["thinking"] {
  if (intents.includes("summary_request")) {
    return {
      mode: "summarizing_case",
      steps: ["汇总已确认事实", "区分判断与待验证项", "输出当前总结"],
    };
  }

  if (intents.includes("correction")) {
    return {
      mode: "reviewing_prior_judgement",
      steps: ["对比新旧信息", "标记受影响段落", "更新当前判断"],
    };
  }

  return {
    mode: "processing_input",
    steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
  };
}

function inferResponseMode(intents: ConversationTurnAnalysis["intents"]): ConversationTurnAnalysis["responseMode"] {
  if (intents.includes("decision_signal") || intents.includes("summary_request")) {
    return "result_action";
  }

  if (intents.includes("question") && !intents.includes("evidence")) {
    return "inform";
  }

  return "guide";
}

export function buildConversationAnalysis(options: BuildConversationOptions): ConversationTurnAnalysis {
  const intents = detectConversationIntents(options.content);
  const sourceShape = detectConversationSourceShape(options.content, intents);
  const caseOperation = detectConversationCaseOperation({
    content: options.content,
    currentCaseTitle: options.currentCaseTitle,
    currentKnownFacts: options.currentKnownFacts ?? [],
    sourceShape,
    hasCurrentCase: options.hasCurrentCase ?? true,
  });

  return {
    intents,
    sourceShape,
    caseOperation,
    responseMode: inferResponseMode(intents),
    thinking: inferThinking(intents),
    knownFacts: options.knownFacts ?? [],
    assumptions: options.assumptions ?? [],
    riskFlags: options.riskFlags ?? [],
    summaryRequested: intents.includes("summary_request"),
    assistantReplyDraft: options.assistantReplyDraft ?? null,
    suggestedCaseTitle: inferCaseTitleFromInput(options.content),
    reasoningNotes: "test_fixture",
  };
}

export function buildConversationLlmResponse(options: BuildConversationOptions) {
  return JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify(buildConversationAnalysis(options)),
        },
      },
    ],
  });
}
