import type { EvidencePayload } from "@/lib/domain/types";

import type { PromptMessage } from "./types";

export function buildExtractionPrompt(payload: EvidencePayload): PromptMessage[] {
  const schema = {
    knownFacts: [{ field: "customer", value: "string", confidence: 0.95 }],
    assumptions: [{ statement: "string", needsValidation: true }],
    riskFlags: ["string"],
  };

  return [
    {
      role: "system",
      content:
        "你是电子质量工程 8D 助手。请从用户证据中提取对案件推进最有用的结构化信息。输出必须是 JSON，不要输出 Markdown，不要解释。",
    },
    {
      role: "user",
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
  ];
}
