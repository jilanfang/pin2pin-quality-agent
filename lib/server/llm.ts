import { z } from "zod";

import {
  detectConversationCaseOperation,
  detectConversationIntents,
  detectConversationSourceShape,
  inferCaseTitleFromInput,
} from "@/lib/domain/conversation-input";
import type {
  ConversationCaseOperation,
  ConversationIntent,
  ConversationResponseMode,
  ConversationSourceShape,
  ConversationThinkingPlan,
  ConversationTurnAnalysis,
  EvidenceExtraction,
  EvidencePayload,
  FactItem,
  ThinkingMode,
} from "@/lib/domain/types";

type SupportedProvider = "qwen" | "deepseek" | "ark";
type LlmCapability = "extract" | "copilot" | "report" | "conversation";
type CapabilityRouteSlot = "primary" | "fallback";
type LlmFailureCode =
  | "provider_unconfigured"
  | "request_failed"
  | "non_json_response"
  | "fallback_exhausted"
  | "recovered_via_fallback";

const DEFAULT_EXTRACT_MODEL = "qwen3.5-122b-a10b";
const DEFAULT_ANALYSIS_MODEL = "deepseek-v3.2-exp";
const DEFAULT_COPILOT_MODEL = "deepseek-v3.2";
const DEFAULT_REPORT_MODEL = "qwen3.5-122b-a10b";
const DEFAULT_ARK_MODEL = "ark-code-latest";
const CONVERSATION_ANALYSIS_VERSION = "conversation-v1";
const RULE_BASELINE_ANALYSIS_VERSION = "rule-baseline-v1";
const REQUIRED_LLM_ERROR_CODE = "llm_required_unavailable";
const REQUIRED_LLM_ERROR_MESSAGE = "当前模型服务不可用，本次调查输入未被处理，请稍后重试。";
const ALLOWED_CONVERSATION_INTENTS = [
  "evidence",
  "question",
  "summary_request",
  "correction",
  "decision_signal",
] as const satisfies readonly ConversationIntent[];
const ALLOWED_SOURCE_SHAPES = [
  "long_document",
  "fragmented_update",
  "meeting_notes",
  "question_only",
  "mixed_input",
] as const satisfies readonly ConversationSourceShape[];
const ALLOWED_CASE_OPERATIONS = [
  "create_new_case",
  "attach_to_current_case",
  "needs_case_confirmation",
] as const satisfies readonly ConversationCaseOperation[];
const ALLOWED_RESPONSE_MODES = [
  "inform",
  "guide",
  "result_action",
] as const satisfies readonly ConversationResponseMode[];
const MAX_CONTEXT_FACTS = 12;
const ALLOWED_THINKING_MODES = [
  "processing_input",
  "reviewing_prior_judgement",
  "summarizing_case",
  "preparing_artifact",
] as const satisfies readonly ThinkingMode[];

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ProviderRoute = {
  provider: SupportedProvider;
  slot: CapabilityRouteSlot;
  baseUrl: string;
  apiKey?: string;
  model: string;
};

const DEFAULT_TIMEOUT_MS = 4000;

class LlmRouteError extends Error {
  code: LlmFailureCode;

  constructor(code: LlmFailureCode, message: string) {
    super(message);
    this.code = code;
  }
}

export class RequiredLlmUnavailableError extends Error {
  code: typeof REQUIRED_LLM_ERROR_CODE;
  status: number;

  constructor(message = REQUIRED_LLM_ERROR_MESSAGE) {
    super(message);
    this.code = REQUIRED_LLM_ERROR_CODE;
    this.status = 503;
  }
}

function isEnabled() {
  return process.env.AI_QUALITY_LLM_ENABLED === "true";
}

function useRuleBaselineForConversation() {
  return process.env.AI_QUALITY_LLM_RULE_BASELINE === "true";
}

function parseProvider(value: string | undefined): SupportedProvider | null {
  if (value === "qwen" || value === "deepseek" || value === "ark") return value;
  return null;
}

function getProvider(): SupportedProvider | null {
  return parseProvider(process.env.AI_QUALITY_LLM_PROVIDER);
}

function getCapabilityEnvValue(
  capability: LlmCapability,
  slot: CapabilityRouteSlot,
  suffix: "PROVIDER" | "MODEL"
) {
  return process.env[
    `AI_QUALITY_LLM_${capability.toUpperCase()}_${slot.toUpperCase()}_${suffix}`
  ]?.trim();
}

function inferFallbackProvider(primaryProvider: SupportedProvider): SupportedProvider | null {
  const configuredFallback = parseProvider(process.env.AI_QUALITY_LLM_FALLBACK_PROVIDER?.trim());
  if (
    configuredFallback &&
    configuredFallback !== primaryProvider
  ) {
    return configuredFallback;
  }

  if (primaryProvider === "qwen" && process.env.AI_QUALITY_ARK_API_KEY) return "ark";
  if (primaryProvider === "ark" && process.env.AI_QUALITY_LLM_API_KEY) return "qwen";
  return null;
}

function getCapabilityProvider(
  capability: LlmCapability,
  slot: CapabilityRouteSlot,
  primaryProvider?: SupportedProvider
): SupportedProvider | null {
  const configuredProvider = parseProvider(getCapabilityEnvValue(capability, slot, "PROVIDER"));
  if (configuredProvider) return configuredProvider;

  if (slot === "primary") return getProvider();
  if (!primaryProvider) return null;
  return inferFallbackProvider(primaryProvider);
}

function getDefaultModel(capability: LlmCapability, provider: SupportedProvider) {
  if (provider === "ark") return DEFAULT_ARK_MODEL;
  if (capability === "copilot" && provider === "deepseek") return DEFAULT_COPILOT_MODEL;
  if (capability === "conversation" && provider === "deepseek") return DEFAULT_ANALYSIS_MODEL;
  if (capability === "report" && provider === "qwen") return DEFAULT_REPORT_MODEL;
  if (capability === "report" && provider === "deepseek") return DEFAULT_COPILOT_MODEL;
  if (provider === "deepseek") return DEFAULT_ANALYSIS_MODEL;
  return DEFAULT_EXTRACT_MODEL;
}

function buildChatCompletionsUrl(baseUrl: string, mode: "generic" | "direct" = "generic") {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/u, "");
  if (mode === "direct") return `${normalizedBaseUrl}/chat/completions`;
  return normalizedBaseUrl.endsWith("/v1")
    ? `${normalizedBaseUrl}/chat/completions`
    : `${normalizedBaseUrl}/v1/chat/completions`;
}

function getTimeoutMs(capability: LlmCapability) {
  const capabilityOverride = process.env[
    `AI_QUALITY_LLM_${capability.toUpperCase()}_TIMEOUT_MS`
  ]?.trim();
  const globalOverride = process.env.AI_QUALITY_LLM_TIMEOUT_MS?.trim();
  const raw = capabilityOverride || globalOverride;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_TIMEOUT_MS;
}

function getProviderConfig(
  capability: LlmCapability,
  provider: SupportedProvider,
  slot: CapabilityRouteSlot
) {
  const genericBaseUrl = process.env.AI_QUALITY_LLM_BASE_URL?.trim();
  const genericApiKey = process.env.AI_QUALITY_LLM_API_KEY?.trim();
  const capabilityModel = getCapabilityEnvValue(capability, slot, "MODEL");
  const legacyExtractModel =
    capability === "extract" ? process.env.AI_QUALITY_LLM_MODEL_EXTRACT?.trim() : undefined;
  const configuredModel = capabilityModel || legacyExtractModel || getDefaultModel(capability, provider);
  if (provider === "ark") {
    return {
      baseUrl: buildChatCompletionsUrl(
        process.env.AI_QUALITY_ARK_BASE_URL?.trim() || "https://ark.cn-beijing.volces.com/api/coding/v3",
        "direct"
      ),
      apiKey: process.env.AI_QUALITY_ARK_API_KEY,
      model: capabilityModel || process.env.AI_QUALITY_ARK_MODEL?.trim() || configuredModel,
    };
  }

  if (genericBaseUrl && genericApiKey) {
    return {
      baseUrl: buildChatCompletionsUrl(genericBaseUrl),
      apiKey: genericApiKey,
      model: configuredModel,
    };
  }

  if (provider === "qwen") {
    return {
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      apiKey: process.env.DASHSCOPE_API_KEY,
      model: configuredModel,
    };
  }

  return {
    baseUrl: "https://api.deepseek.com/chat/completions",
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: configuredModel,
  };
}

function getProviderRoutes(capability: LlmCapability): ProviderRoute[] {
  const primaryProvider = getCapabilityProvider(capability, "primary");
  if (!primaryProvider) return [];

  const providerSlots: Array<{ provider: SupportedProvider; slot: CapabilityRouteSlot }> = [
    { provider: primaryProvider, slot: "primary" },
  ];
  const fallbackProvider = getCapabilityProvider(capability, "fallback", primaryProvider);
  if (
    fallbackProvider &&
    !providerSlots.some((candidate) => candidate.provider === fallbackProvider)
  ) {
    providerSlots.push({ provider: fallbackProvider, slot: "fallback" });
  }

  return providerSlots
    .map(({ provider, slot }) => ({
      provider,
      slot,
      ...getProviderConfig(capability, provider, slot),
    }));
}

function buildExtractionPrompt(payload: EvidencePayload) {
  const schema = {
    knownFacts: [{ field: "customer", value: "string", confidence: 0.95 }],
    assumptions: [{ statement: "string", needsValidation: true }],
    riskFlags: ["string"],
  };

  return [
    {
      role: "system" as const,
      content:
        "你是电子质量工程 8D 助手。请从用户证据中提取对案件推进最有用的结构化信息。输出必须是 JSON，不要输出 Markdown，不要解释。",
    },
    {
      role: "user" as const,
      content: [
        `当前阶段：${payload.contextStage ?? "D2"}`,
        "任务：提取 knownFacts / assumptions / riskFlags。",
        "要求：",
        "1. 只提取对 8D 推进有帮助的信息。",
        "2. knownFacts 的 field 使用现有系统字段，例如 customer/model/batch/work_order/line/discovery_time/impact/failure_location/change_point/containment_customer_site/containment_shipped/containment_stock/containment_wip。",
        "3. assumptions 只放仍待验证的推测。",
        "4. riskFlags 只放业务风险提醒。",
        `输出 JSON schema 示例：${JSON.stringify(schema)}`,
        `用户输入：${payload.content}`,
      ].join("\n"),
    },
  ] satisfies ChatMessage[];
}

function buildConversationPrompt(payload: EvidencePayload, options: {
  currentCaseTitle?: string | null;
  currentKnownFacts?: FactItem[];
  hasCurrentCase: boolean;
}) {
  const currentFacts = (options.currentKnownFacts ?? [])
    .slice(0, MAX_CONTEXT_FACTS)
    .map((item) => `${item.field}: ${item.value}`)
    .join("; ");

  return [
    {
      role: "system" as const,
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
      role: "user" as const,
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
  ] satisfies ChatMessage[];
}

function inferThinkingFromIntents(intents: ConversationIntent[]): ConversationThinkingPlan {
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

function inferResponseMode(intents: ConversationIntent[]): ConversationResponseMode {
  if (intents.includes("decision_signal") || intents.includes("summary_request")) {
    return "result_action";
  }

  if (intents.includes("question") && !intents.includes("evidence")) {
    return "inform";
  }

  return "guide";
}

function buildRuleBaselineConversationAnalysis(
  payload: EvidencePayload,
  options: {
    currentCaseTitle?: string | null;
    currentKnownFacts?: FactItem[];
    hasCurrentCase: boolean;
  }
): ConversationTurnAnalysis {
  const intents = detectConversationIntents(payload.content);
  const sourceShape = detectConversationSourceShape(payload.content, intents);
  const caseOperation = detectConversationCaseOperation({
    content: payload.content,
    currentCaseTitle: options.currentCaseTitle,
    currentKnownFacts: options.currentKnownFacts,
    sourceShape,
    hasCurrentCase: options.hasCurrentCase,
  });

  return {
    intents,
    sourceShape,
    caseOperation,
    responseMode: inferResponseMode(intents),
    thinking: inferThinkingFromIntents(intents),
    knownFacts: [],
    assumptions: [],
    riskFlags: [],
    summaryRequested: intents.includes("summary_request"),
    assistantReplyDraft: null,
    suggestedCaseTitle: inferCaseTitleFromInput(payload.content),
    reasoningNotes: "rule_baseline",
  };
}

function sanitizeFacts(input: unknown): FactItem[] {
  if (!Array.isArray(input)) return [];
  const facts: FactItem[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const field =
      typeof (item as { field?: unknown }).field === "string"
        ? (item as { field: string }).field.trim()
        : "";
    const value =
      typeof (item as { value?: unknown }).value === "string"
        ? (item as { value: string }).value.trim()
        : "";
    const confidenceValue = (item as { confidence?: unknown }).confidence;
    const confidence =
      typeof confidenceValue === "number" && Number.isFinite(confidenceValue)
        ? confidenceValue
        : 0.85;
    if (!field || !value) continue;
    facts.push({
      field,
      value,
      confidence,
      source: "llm",
    });
  }
  return facts;
}

function sanitizeAssumptions(input: unknown): EvidenceExtraction["assumptions"] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const statement =
        typeof (item as { statement?: unknown }).statement === "string"
          ? (item as { statement: string }).statement.trim()
          : "";
      if (!statement) return null;
      return {
        statement,
        needsValidation: (item as { needsValidation?: unknown }).needsValidation !== false,
      };
    })
    .filter(
      (
        item
      ): item is {
        statement: string;
        needsValidation: boolean;
      } => Boolean(item)
    );
}

function sanitizeRiskFlags(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseExtraction(content: string): EvidenceExtraction | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = JSON.parse(trimmed) as {
      knownFacts?: unknown;
      assumptions?: unknown;
      riskFlags?: unknown;
    };
  } catch {
    throw new LlmRouteError("non_json_response", "assistant content is not valid JSON");
  }

  return {
    knownFacts: sanitizeFacts(parsed.knownFacts),
    assumptions: sanitizeAssumptions(parsed.assumptions),
    riskFlags: sanitizeRiskFlags(parsed.riskFlags),
  };
}

const conversationAnalysisSchema = z.object({
  intents: z.array(z.enum(ALLOWED_CONVERSATION_INTENTS)).min(1),
  sourceShape: z.enum(ALLOWED_SOURCE_SHAPES),
  caseOperation: z.enum(ALLOWED_CASE_OPERATIONS),
  responseMode: z.enum(ALLOWED_RESPONSE_MODES),
  thinking: z.object({
    mode: z.enum(ALLOWED_THINKING_MODES),
    steps: z.array(z.string().trim().min(1)).min(1),
  }),
  knownFacts: z.unknown().optional(),
  assumptions: z.unknown().optional(),
  riskFlags: z.unknown().optional(),
  summaryRequested: z.boolean().optional(),
  assistantReplyDraft: z.string().trim().optional().nullable(),
  suggestedCaseTitle: z.string().trim().optional().nullable(),
  reasoningNotes: z.string().trim().optional().nullable(),
});

function parseConversationAnalysis(content: string): ConversationTurnAnalysis | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  let parsed;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    throw new LlmRouteError("non_json_response", "assistant content is not valid JSON");
  }

  const validated = conversationAnalysisSchema.safeParse(parsed);
  if (!validated.success) {
    throw new LlmRouteError("non_json_response", "conversation analysis schema is invalid");
  }

  return {
    intents: validated.data.intents,
    sourceShape: validated.data.sourceShape,
    caseOperation: validated.data.caseOperation,
    responseMode: validated.data.responseMode,
    thinking: validated.data.thinking,
    knownFacts: sanitizeFacts(validated.data.knownFacts),
    assumptions: sanitizeAssumptions(validated.data.assumptions),
    riskFlags: sanitizeRiskFlags(validated.data.riskFlags),
    summaryRequested: validated.data.summaryRequested === true || validated.data.intents.includes("summary_request"),
    assistantReplyDraft: validated.data.assistantReplyDraft ?? null,
    suggestedCaseTitle: validated.data.suggestedCaseTitle ?? null,
    reasoningNotes: validated.data.reasoningNotes ?? null,
  };
}

function buildCopilotPrompt(prompt: string) {
  return [
    {
      role: "system" as const,
      content:
        "你是 Pin2pin Fireline 的 8D 与质量方法助手。回答要面向制造业质量工程师，强调 8D、CAPA、5Why、FMEA、控制计划、量测系统分析等方法的实际应用。回答用中文，简洁、专业、可执行，不要空泛。",
    },
    {
      role: "user" as const,
      content: prompt,
    },
  ] satisfies ChatMessage[];
}

async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
    });
  } catch (error) {
    throw new LlmRouteError(
      "request_failed",
      error instanceof Error ? error.message : "fetch failed"
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new LlmRouteError("request_failed", `status ${response.status}`);
  }

  let payload: OpenAiCompatibleResponse;
  try {
    payload = (await response.json()) as OpenAiCompatibleResponse;
  } catch {
    throw new LlmRouteError("non_json_response", "provider payload is not valid JSON");
  }
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

function warnRoute(
  capability: LlmCapability,
  route: Pick<ProviderRoute, "slot" | "provider">,
  code: Exclude<LlmFailureCode, "fallback_exhausted">,
  detail?: string
) {
  const suffix = detail ? `: ${detail}` : "";
  console.warn(`[llm][${capability}][${route.slot}][${route.provider}] ${code}${suffix}`);
}

function errorCapability(capability: LlmCapability, code: "fallback_exhausted", detail?: string) {
  const suffix = detail ? `: ${detail}` : "";
  console.error(`[llm][${capability}] ${code}${suffix}`);
}

function toRouteFailureCode(error: unknown): Exclude<LlmFailureCode, "fallback_exhausted"> {
  if (error instanceof LlmRouteError && error.code !== "fallback_exhausted") {
    return error.code;
  }
  return "request_failed";
}

/** @deprecated 已被 analyzeConversationTurnWithLlm 取代，后续版本将移除 */
export async function extractEvidenceWithLlm(
  payload: EvidencePayload
): Promise<EvidenceExtraction | null> {
  if (!isEnabled()) return null;

  const routes = getProviderRoutes("extract");
  if (routes.length === 0) return null;
  const timeoutMs = getTimeoutMs("extract");

  const failures: string[] = [];

  for (const route of routes) {
    if (!route.apiKey) {
      warnRoute("extract", route, "provider_unconfigured", "missing api key");
      failures.push(`${route.slot}/${route.provider}:provider_unconfigured`);
      continue;
    }

    try {
      const content = await callOpenAiCompatible(
        route.baseUrl,
        route.apiKey,
        route.model,
        buildExtractionPrompt(payload),
        timeoutMs
      );
      const extraction = parseExtraction(content);
      if (!extraction) {
        warnRoute("extract", route, "non_json_response", "empty extraction content");
        failures.push(`${route.slot}/${route.provider}:non_json_response`);
        continue;
      }
      if (route.slot === "fallback") {
        warnRoute("extract", route, "recovered_via_fallback");
      }
      return extraction;
    } catch (error) {
      const code = toRouteFailureCode(error);
      const detail = error instanceof Error ? error.message : "unexpected llm error";
      warnRoute("extract", route, code, detail);
      failures.push(`${route.slot}/${route.provider}:${code}`);
      continue;
    }
  }

  if (failures.length) {
    errorCapability("extract", "fallback_exhausted", failures.join(" | "));
  }
  return null;
}

export function requiredLlmUnavailableMessage() {
  return REQUIRED_LLM_ERROR_MESSAGE;
}

export function requiredLlmErrorCode() {
  return REQUIRED_LLM_ERROR_CODE;
}

export function conversationAnalysisVersion() {
  return CONVERSATION_ANALYSIS_VERSION;
}

export function ruleBaselineConversationAnalysisVersion() {
  return RULE_BASELINE_ANALYSIS_VERSION;
}

export async function analyzeConversationTurnWithLlm(
  payload: EvidencePayload,
  options: {
    currentCaseTitle?: string | null;
    currentKnownFacts?: FactItem[];
    hasCurrentCase: boolean;
  }
): Promise<ConversationTurnAnalysis> {
  if (!isEnabled()) {
    if (useRuleBaselineForConversation()) {
      return buildRuleBaselineConversationAnalysis(payload, options);
    }
    throw new RequiredLlmUnavailableError();
  }

  const routes = getProviderRoutes("conversation");
  if (routes.length === 0) {
    throw new RequiredLlmUnavailableError();
  }
  const timeoutMs = getTimeoutMs("conversation");
  const failures: string[] = [];

  for (const route of routes) {
    if (!route.apiKey) {
      warnRoute("conversation", route, "provider_unconfigured", "missing api key");
      failures.push(`${route.slot}/${route.provider}:provider_unconfigured`);
      continue;
    }

    try {
      const content = await callOpenAiCompatible(
        route.baseUrl,
        route.apiKey,
        route.model,
        buildConversationPrompt(payload, options),
        timeoutMs
      );
      const analysis = parseConversationAnalysis(content);
      if (!analysis) {
        warnRoute("conversation", route, "non_json_response", "empty conversation content");
        failures.push(`${route.slot}/${route.provider}:non_json_response`);
        continue;
      }
      if (route.slot === "fallback") {
        warnRoute("conversation", route, "recovered_via_fallback");
      }
      return analysis;
    } catch (error) {
      const code = toRouteFailureCode(error);
      const detail = error instanceof Error ? error.message : "unexpected llm error";
      warnRoute("conversation", route, code, detail);
      failures.push(`${route.slot}/${route.provider}:${code}`);
    }
  }

  if (failures.length) {
    errorCapability("conversation", "fallback_exhausted", failures.join(" | "));
  }
  throw new RequiredLlmUnavailableError();
}

export async function askCopilotWithLlm(prompt: string): Promise<string | null> {
  if (!isEnabled()) throw new RequiredLlmUnavailableError();

  const routes = getProviderRoutes("copilot");
  if (routes.length === 0) throw new RequiredLlmUnavailableError();
  const timeoutMs = getTimeoutMs("copilot");
  const failures: string[] = [];

  for (const route of routes) {
    if (!route.apiKey) {
      warnRoute("copilot", route, "provider_unconfigured", "missing api key");
      failures.push(`${route.slot}/${route.provider}:provider_unconfigured`);
      continue;
    }

    try {
      const content = await callOpenAiCompatible(
        route.baseUrl,
        route.apiKey,
        route.model,
        buildCopilotPrompt(prompt),
        timeoutMs
      );
      const answer = content.trim();
      if (!answer) {
        warnRoute("copilot", route, "non_json_response", "empty copilot content");
        failures.push(`${route.slot}/${route.provider}:non_json_response`);
        continue;
      }
      if (route.slot === "fallback") {
        warnRoute("copilot", route, "recovered_via_fallback");
      }
      return answer;
    } catch (error) {
      const code = toRouteFailureCode(error);
      const detail = error instanceof Error ? error.message : "unexpected llm error";
      warnRoute("copilot", route, code, detail);
      failures.push(`${route.slot}/${route.provider}:${code}`);
    }
  }

  if (failures.length) {
    errorCapability("copilot", "fallback_exhausted", failures.join(" | "));
  }

  throw new RequiredLlmUnavailableError();
}
