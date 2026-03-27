import type { EvidenceExtraction, EvidencePayload, FactItem } from "@/lib/domain/types";

type SupportedProvider = "qwen" | "deepseek" | "ark";
type LlmCapability = "extract" | "copilot" | "report";
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

function isEnabled() {
  return process.env.AI_QUALITY_LLM_ENABLED === "true";
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
