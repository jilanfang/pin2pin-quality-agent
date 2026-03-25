import type { AssumptionItem, FactItem, GapItem } from "@/lib/domain/types";

const GAP_REASONS = {
  batch: "缺少异常批次",
  discoveryTime: "缺少首次发现时间",
  impact: "缺少影响范围",
} as const;

export interface ExtractionResult {
  knownFacts: FactItem[];
  missingFields: GapItem[];
  assumptions: AssumptionItem[];
  riskFlags: string[];
}

function factValue(knownFacts: FactItem[], field: string) {
  return knownFacts.find((item) => item.field === field)?.value;
}

function hasAnyTerm(content: string, terms: string[]) {
  return terms.some((term) => content.includes(term));
}

function pushGap(missingFields: GapItem[], field: string, reason: string, priority: GapItem["priority"]) {
  if (missingFields.some((item) => item.field === field)) return;
  missingFields.push({ field, reason, priority });
}

function normalizeContainmentStatus(value: string | undefined) {
  const cleaned = value?.trim().replace(/^[，,。；;\s]+|[，,。；;\s]+$/g, "");
  if (!cleaned) return undefined;
  if (cleaned.startsWith("已") || cleaned.startsWith("暂停") || cleaned.startsWith("待")) return cleaned;
  return `已${cleaned}`;
}

function appendFact(
  knownFacts: FactItem[],
  field: string,
  value: string | undefined,
  confidence = 0.85
) {
  const cleaned = (value ?? "").trim().replace(/^[，,。；;\s]+|[，,。；;\s]+$/g, "");
  if (!cleaned) return;
  if (knownFacts.some((item) => item.field === field)) return;
  knownFacts.push({
    field,
    value: cleaned,
    confidence,
    source: "user_input",
  });
}

export function extractCaseState(content: string): ExtractionResult {
  const normalized = content.trim();
  const lowered = normalized.toLowerCase();

  const knownFacts: FactItem[] = [];
  const missingFields: GapItem[] = [];
  const assumptions: AssumptionItem[] = [];
  const riskFlags: string[] = [];

  if (normalized) {
    knownFacts.push({
      field: "problem_symptom",
      value: normalized,
      confidence: 0.7,
      source: "user_input",
    });
  }

  const batchMatch = normalized.match(/(?:\bbatch\s+|批次号?[:：]?\s*)([A-Za-z0-9_-]+)/i);
  appendFact(knownFacts, "batch", batchMatch?.[1], 0.95);

  const dateMatch =
    normalized.match(/\b(?:on|at)\s+([A-Z][a-z]+\s+\d{1,2})\b/i) ??
    normalized.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/) ??
    normalized.match(/(\d{1,2}月\d{1,2}日)/);
  appendFact(knownFacts, "discovery_time", dateMatch?.[1], 0.85);

  const impactMatch =
    normalized.match(/\bimpact(?:ing|ed)?\s+([^.,;]+)/i) ??
    normalized.match(/影响[:：]?\s*([^，。,；;]+)/);
  appendFact(knownFacts, "impact", impactMatch?.[1], 0.85);
  if (!factValue(knownFacts, "impact")) {
    const countImpactMatch = normalized.match(/(?:客户(?:端)?|产线|现场)?[^。]*?(\d+\s*(?:台|片|PCS|pcs))[^。]*?(?:异常|不良|失效)/i);
    appendFact(knownFacts, "impact", countImpactMatch?.[1], 0.8);
  }

  const urgentComplaint =
    hasAnyTerm(normalized, ["客户", "客诉"]) &&
    hasAnyTerm(normalized, ["停线", "冒烟", "爆板", "火花", "停止发货", "24小时", "24 小时"]);
  if (urgentComplaint) {
    appendFact(knownFacts, "mode", "customer_complaint_urgent", 0.96);
    appendFact(knownFacts, "severity", "high", 0.95);
  }

  if (normalized.includes("客户") || lowered.includes("customer")) {
    appendFact(knownFacts, "scenario", "customer complaint", 0.8);
  } else {
    assumptions.push({
      statement: "Issue may not yet be tied to an external customer complaint.",
      needsValidation: true,
    });
  }

  const customerMatch = normalized.match(
    /客户\s*([A-Za-z0-9][A-Za-z0-9_-]*?)(?=项目|机种|型号|Lot|Date\s*Code|线别|工单|[，,。；;\s])/i
  );
  appendFact(knownFacts, "customer", customerMatch?.[1], 0.9);
  const customerCnMatch =
    normalized.match(
      /客户(?:名称)?[:：]?\s*(?!端|现场)([\u4e00-\u9fa5A-Za-z0-9_-]{2,20}?)(?=反馈|今天|要求|产线|项目|机种|型号|Lot|Date\s*Code|线别|工单|[，,。；;\s])/i
    ) ??
    normalized.match(
      /客户(?!端|现场)([\u4e00-\u9fa5A-Za-z0-9_-]{2,20}?)(?=反馈|今天|要求|产线|项目|机种|型号|Lot|Date\s*Code|线别|工单|[，,。；;\s])/i
    );
  appendFact(knownFacts, "customer", customerCnMatch?.[1], 0.92);

  const projectMatch = normalized.match(
    /项目\s*([A-Za-z0-9][A-Za-z0-9_-]*?)(?=机种|型号|Lot|Date\s*Code|线别|工单|[，,。；;\s])/i
  );
  appendFact(knownFacts, "project", projectMatch?.[1], 0.88);

  const modelMatch = normalized.match(/(?:机种|型号)\s*([A-Za-z0-9][A-Za-z0-9_-]*)/i);
  appendFact(knownFacts, "model", modelMatch?.[1], 0.88);
  const inferredModelMatch = normalized.match(/\b([A-Z]{2,}[A-Z0-9_-]{1,})\b/);
  appendFact(knownFacts, "model", inferredModelMatch?.[1], 0.8);

  const lotMatch =
    normalized.match(/\bLot[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)/i) ??
    normalized.match(/批号[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)/i);
  appendFact(knownFacts, "lot", lotMatch?.[1], 0.9);

  const dateCodeMatch = normalized.match(
    /(?:Date\s*Code|DateCode|DC)[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)/i
  );
  appendFact(knownFacts, "date_code", dateCodeMatch?.[1], 0.9);

  const lineMatch = normalized.match(/线别[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)/i);
  appendFact(knownFacts, "line", lineMatch?.[1], 0.85);
  const smtLineMatch = normalized.match(/(SMT\s*\d+\s*号线|SMT\s*\d+|[A-Za-z0-9_-]+\s*号线)/i);
  appendFact(knownFacts, "line", smtLineMatch?.[1]?.replace(/\s+/g, ""), 0.84);

  const stationMatch = normalized.match(/([A-Za-z0-9][A-Za-z0-9_-]{1,})站/);
  appendFact(knownFacts, "station", stationMatch?.[1], 0.82);

  const workOrderMatch = normalized.match(
    /(?:工单|WO|Work\s*Order)[:：]?\s*([A-Za-z0-9][A-Za-z0-9_-]*)/i
  );
  appendFact(knownFacts, "work_order", workOrderMatch?.[1], 0.9);

  const containmentMatch = normalized.match(
    /(已[^。]*?(?:隔离|暂停出货|封锁|拦截)[^。]*?)(?=，并完成|,并完成|。|$)/
  );
  appendFact(knownFacts, "containment_action", containmentMatch?.[1], 0.8);
  const broaderContainmentMatch = normalized.match(
    /((?:已|已经|已安排|已完成|正在|目前)[^。]*?(?:停止发货|暂停出货|冻结库存|封存|全检|停线|暂停投线|隔离|扣留)[^。]*?)(?=。|$)/
  );
  appendFact(knownFacts, "containment_action", broaderContainmentMatch?.[1], 0.82);

  const customerSiteContainment =
    normalizeContainmentStatus(normalized.match(/客户现场(已[^，。；;\n]*|[^，。；;\n]*)/)?.[1]) ??
    normalizeContainmentStatus(normalized.match(/客户端(已[^，。；;\n]*|[^，。；;\n]*)/)?.[1]) ??
    (normalized.includes("封存待检") ? "已封存待检" : undefined);
  appendFact(knownFacts, "containment_customer_site", customerSiteContainment, 0.8);

  const shippedContainment =
    normalizeContainmentStatus(
      normalized.match(/已发货(?:批次)?(?:正在|已)?([^，。；;\n]*)/)?.[1]?.replace(/^批次/, "")
    ) ??
    normalizeContainmentStatus(normalized.match(/出货(?:正在|已)?([^，。；;\n]*)/)?.[1]) ??
    (normalized.includes("冻结追查") ? "已冻结追查" : undefined);
  appendFact(knownFacts, "containment_shipped", shippedContainment, 0.8);

  const stockContainment =
    normalizeContainmentStatus(normalized.match(/成品库存(已[^，。；;\n]*|[^，。；;\n]*)/)?.[1]) ??
    normalizeContainmentStatus(normalized.match(/库存(已[^，。；;\n]*|[^，。；;\n]*)/)?.[1]) ??
    (normalized.includes("扣留") ? "已扣留" : undefined);
  appendFact(knownFacts, "containment_stock", stockContainment, 0.8);

  const wipContainment =
    normalizeContainmentStatus(normalized.match(/在制品(已[^，。；;\n]*|[^，。；;\n]*)/)?.[1]) ??
    (normalized.includes("暂停投线") ? "暂停投线" : undefined);
  appendFact(knownFacts, "containment_wip", wipContainment, 0.8);

  const failureLocationMatch =
    normalized.match(/(?:失效位置|失效部位|异常位置|位号)[:：]?\s*([A-Za-z0-9_-]+)/i) ??
    normalized.match(/([A-Za-z]{1,4}\d{1,3})\s*位号/i) ??
    normalized.match(/([A-Za-z]{1,4}\d{1,3})\s*(?:电容|二极管|IC|芯片|连接器|元件)/i) ??
    normalized.match(/(电源输入端|输入端|输出端|连接器处|电容\s*[A-Za-z0-9_-]+)/);
  appendFact(knownFacts, "failure_location", failureLocationMatch?.[1], 0.84);

  const batchTraceReady =
    !!batchMatch?.[1] ||
    !!workOrderMatch?.[1] ||
    !!lineMatch?.[1] ||
    !!smtLineMatch?.[1] ||
    !!dateMatch?.[1];
  if (batchTraceReady) {
    appendFact(knownFacts, "batch_trace", "available", 0.75);
  }

  const changePointMatch = normalized.match(
    /((?:替代料|换料|导入|程序|角度|AOI|阈值|编带方向|B品牌|A品牌)[^。]*?)(?=。|$)/
  );
  appendFact(knownFacts, "change_point", changePointMatch?.[1], 0.82);

  const validationMatch = normalized.match(/(完成[^。]*?(?:验证|复测|确认)[^。]*?)(?=。|$)/);
  appendFact(knownFacts, "validation_record", validationMatch?.[1], 0.8);

  if (!factValue(knownFacts, "impact") && urgentComplaint) {
    const impactParts: string[] = [];
    if (normalized.includes("停线")) impactParts.push("客户产线停线");
    if (normalized.includes("停止发货") || normalized.includes("暂停出货")) impactParts.push("要求停止发货");
    if (normalized.includes("24小时") || normalized.includes("24 小时")) impactParts.push("24h 内需初步回复");
    appendFact(knownFacts, "impact", impactParts.join("，"), 0.86);
  }

  if (!knownFacts.some((item) => item.field === "batch")) {
    pushGap(missingFields, "batch", GAP_REASONS.batch, "high");
  }
  if (!knownFacts.some((item) => item.field === "discovery_time")) {
    pushGap(missingFields, "discovery_time", GAP_REASONS.discoveryTime, "high");
  }
  if (!knownFacts.some((item) => item.field === "impact")) {
    pushGap(missingFields, "impact", GAP_REASONS.impact, "high");
  }

  if (urgentComplaint) {
    if (!factValue(knownFacts, "failure_location")) {
      pushGap(missingFields, "failure_location", "还缺失效位置，无法判断现场失效链路。", "high");
    }
    if (!factValue(knownFacts, "containment_action")) {
      pushGap(missingFields, "containment_status", "还缺客户现场和厂内围堵状态，当前不能判断风险窗口。", "high");
    }
    if (!factValue(knownFacts, "batch_trace")) {
      pushGap(missingFields, "batch_trace", "还缺工单、批次、线别或时间追溯，无法快速锁定影响范围。", "high");
    }
    if (!factValue(knownFacts, "change_point")) {
      pushGap(missingFields, "change_point", "还没有 change point 线索，需先确认替代料、换料、程序或检测参数变化。", "medium");
    }
  }

  if (lowered.includes("intermittent") || normalized.includes("偶发")) {
    riskFlags.push("Intermittent issue may require stronger reproduction evidence.");
  }
  if (urgentComplaint) {
    riskFlags.push("客户停线级异常，需持续复审。");
  }

  return {
    knownFacts,
    missingFields,
    assumptions,
    riskFlags,
  };
}

export function recomputeCaseState(
  knownFacts: FactItem[],
  assumptions: AssumptionItem[] = [],
  riskFlags: string[] = []
): ExtractionResult {
  const missingFields: GapItem[] = [];
  const fields = new Set(knownFacts.map((item) => item.field));

  if (!fields.has("batch")) {
    pushGap(missingFields, "batch", GAP_REASONS.batch, "high");
  }
  if (!fields.has("discovery_time")) {
    pushGap(missingFields, "discovery_time", GAP_REASONS.discoveryTime, "high");
  }
  if (!fields.has("impact")) {
    pushGap(missingFields, "impact", GAP_REASONS.impact, "high");
  }

  if (fields.has("mode") && factValue(knownFacts, "mode") === "customer_complaint_urgent") {
    if (!fields.has("failure_location")) {
      pushGap(missingFields, "failure_location", "还缺失效位置，无法判断现场失效链路。", "high");
    }
    if (!fields.has("containment_action")) {
      pushGap(missingFields, "containment_status", "还缺客户现场和厂内围堵状态，当前不能判断风险窗口。", "high");
    }
    if (!fields.has("batch_trace")) {
      pushGap(missingFields, "batch_trace", "还缺工单、批次、线别或时间追溯，无法快速锁定影响范围。", "high");
    }
    if (!fields.has("change_point")) {
      pushGap(missingFields, "change_point", "还没有 change point 线索，需先确认替代料、换料、程序或检测参数变化。", "medium");
    }
  }

  const nextAssumptions = [...assumptions];
  if (!fields.has("scenario")) {
    const fallbackStatement = "Issue may not yet be tied to an external customer complaint.";
    if (!nextAssumptions.some((item) => item.statement === fallbackStatement)) {
      nextAssumptions.push({
        statement: fallbackStatement,
        needsValidation: true,
      });
    }
  }

  return {
    knownFacts,
    missingFields,
    assumptions: nextAssumptions,
    riskFlags,
  };
}
