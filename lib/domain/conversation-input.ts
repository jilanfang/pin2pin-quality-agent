import type {
  ConversationCaseOperation,
  ConversationIntent,
  ConversationSourceShape,
  FactItem,
} from "@/lib/domain/types";

function hasAnyMarker(content: string, markers: string[]) {
  return markers.some((marker) => content.includes(marker));
}

function detectCustomerFromContent(content: string) {
  return (
    content.match(/客户(?:名称)?[:：]?\s*([\u4e00-\u9fa5A-Za-z0-9_-]{2,20}?)(?=反馈|邮件|现场|端|又|要求|项目|机种|型号|批次|，|。|\s)/)?.[1] ??
    content.match(/客户([\u4e00-\u9fa5A-Za-z0-9_-]{2,20}?)(?=反馈|邮件|现场|端|又|要求|项目|机种|型号|批次|，|。|\s)/)?.[1] ??
    null
  );
}

function detectBatchFromContent(content: string) {
  return content.match(/(?:批次号?|Lot)[:：]?\s*([A-Za-z0-9_-]+)/i)?.[1] ?? null;
}

function detectModelFromContent(content: string) {
  return content.match(/(?:机种|型号)\s*([A-Za-z0-9][A-Za-z0-9_-]*)/i)?.[1] ?? null;
}

function detectSymptom(content: string) {
  return (
    content.match(/(上电冒烟|冒烟|打火|停线|爆板|虚焊|短路|开路|漏电|失效|异常)/)?.[1] ??
    content.match(/([\u4e00-\u9fa5]{2,8}异常)/)?.[1] ??
    null
  );
}

export function detectConversationIntents(content: string): ConversationIntent[] {
  const normalized = content.replace(/\s+/g, "").toLowerCase();
  const decisionRequestPattern =
    /(?:给我|帮我|先|请|直接).{0,8}(?:8d|分析结论|行动方案|预览|出一版|整理一下)/;
  const summarySignals = [
    "总结",
    "汇总",
    "概括",
    "梳理",
    "现在情况",
    "当前情况",
    "目前情况",
    "进展",
    "帮我看一下",
    "帮我总结",
    "现在怎么样",
    "summary",
  ];
  const questionSignals = [
    "为什么",
    "怎么办",
    "做什么",
    "下一步",
    "怎么说",
    "怎么回复",
    "如何回复",
    "能不能",
    "还缺什么",
    "是不是",
    "卡在",
    "为什么还",
  ];
  const evidenceLeadMarkers = [
    "客户",
    "现场",
    "批次",
    "补充",
    "确认",
    "反馈",
    "冒烟",
    "打火",
    "停线",
    "冻结",
    "先别放",
  ];
  const correctionSignals = ["等下", "刚刚不对", "新情况", "补充一下", "推翻", "不是这个", "回看"];
  const decisionSignals = ["可以整理", "先出一版", "生成", "给我预览", "整理一下", "预览一下"];
  const summaryOnlySignals = [...summarySignals, "一下", "现在", "当前", "情况", "帮我", "看", "下"];
  const intents: ConversationIntent[] = [];

  if (summarySignals.some((signal) => normalized.includes(signal))) {
    intents.push("summary_request");
  }
  if (questionSignals.some((signal) => normalized.includes(signal))) {
    intents.push("question");
  }
  if (correctionSignals.some((signal) => normalized.includes(signal))) {
    intents.push("correction");
  }
  if (decisionSignals.some((signal) => normalized.includes(signal))) {
    intents.push("decision_signal");
  }
  if (!intents.includes("decision_signal") && decisionRequestPattern.test(normalized)) {
    intents.push("decision_signal");
  }

  const summaryRemainder = summaryOnlySignals.reduce(
    (current, signal) => current.replaceAll(signal, ""),
    normalized
  );
  const questionIndexes = questionSignals
    .map((signal) => normalized.indexOf(signal))
    .filter((index) => index >= 0);
  const firstQuestionIndex = questionIndexes.length ? Math.min(...questionIndexes) : -1;
  const narrativeBeforeQuestion = firstQuestionIndex >= 0 ? normalized.slice(0, firstQuestionIndex) : "";
  const hasEvidenceNarrativeBeforeQuestion =
    narrativeBeforeQuestion.length >= 8 &&
    (/[，。,；;!！]/.test(content.slice(0, Math.max(firstQuestionIndex, 0))) ||
      evidenceLeadMarkers.some((marker) => narrativeBeforeQuestion.includes(marker)));
  const hasEvidenceMarkersAnywhere = evidenceLeadMarkers.some((marker) => normalized.includes(marker));
  const hasStandaloneEvidenceSignal =
    hasEvidenceMarkersAnywhere || hasEvidenceNarrativeBeforeQuestion || intents.includes("summary_request") || intents.includes("correction");
  const looksLikeEvidence =
    normalized.length > 0 &&
    (!intents.includes("question") || hasEvidenceNarrativeBeforeQuestion) &&
    (!intents.includes("summary_request") || summaryRemainder.length > 6) &&
    (intents.length === 0 || hasStandaloneEvidenceSignal);

  if (
    looksLikeEvidence &&
    (intents.length === 0 ||
      (intents.includes("question") && hasEvidenceNarrativeBeforeQuestion) ||
      intents.includes("summary_request") ||
      intents.includes("correction") ||
      intents.includes("decision_signal"))
  ) {
    intents.unshift("evidence");
  }

  if (!intents.length) {
    return ["evidence"];
  }

  return intents.filter((intent, index) => intents.indexOf(intent) === index);
}

export function inferCaseTitleFromInput(content: string) {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) return "新的 8D 案件";

  const customer = detectCustomerFromContent(cleaned)?.replace(/反馈|邮件|现场|客户端/g, "");
  const symptom = detectSymptom(cleaned);

  if (customer && symptom) return `${customer}${symptom}客诉`;
  if (customer) return `${customer}客诉案件`;
  if (symptom) return `${symptom}分析案件`;

  const brief = cleaned.slice(0, 18).replace(/[，。；;,.!！?？:：]/g, "").trim();
  return brief ? `${brief}案件` : "新的 8D 案件";
}

export function detectConversationSourceShape(
  content: string,
  intents: ConversationIntent[]
): ConversationSourceShape {
  const normalized = content.trim();
  const lowered = normalized.toLowerCase();
  const lineCount = normalized.split(/\n+/).filter(Boolean).length;

  if (intents.length === 1 && intents[0] === "question") {
    return "question_only";
  }

  if (
    normalized.includes("会议纪要") ||
    normalized.includes("会后") ||
    normalized.includes("参会") ||
    lowered.includes("meeting minutes") ||
    lowered.includes("meeting note")
  ) {
    return "meeting_notes";
  }

  if (
    normalized.length >= 120 ||
    lineCount >= 4 ||
    hasAnyMarker(lowered, ["from:", "subject:", "dear", "hi team", "客户反馈", "邮件", "投诉", "要求", "24小时"])
  ) {
    return "long_document";
  }

  if (intents.length > 1) {
    return "mixed_input";
  }

  return "fragmented_update";
}

function factValue(knownFacts: FactItem[], field: string) {
  return knownFacts.find((item) => item.field === field)?.value;
}

export function detectConversationCaseOperation(options: {
  content: string;
  currentCaseTitle?: string | null;
  currentKnownFacts?: FactItem[];
  sourceShape: ConversationSourceShape;
  hasCurrentCase: boolean;
}): ConversationCaseOperation {
  const { content, currentCaseTitle, currentKnownFacts = [], sourceShape, hasCurrentCase } = options;

  if (!hasCurrentCase) {
    return "create_new_case";
  }

  if (sourceShape !== "long_document" && sourceShape !== "meeting_notes") {
    return "attach_to_current_case";
  }

  const normalized = content.trim();
  if (normalized.length < 60) {
    return "attach_to_current_case";
  }

  if (currentKnownFacts.length === 0) {
    return "attach_to_current_case";
  }

  const currentCustomer = factValue(currentKnownFacts, "customer");
  const currentBatch = factValue(currentKnownFacts, "batch");
  const currentModel = factValue(currentKnownFacts, "model");
  const candidateCustomer = detectCustomerFromContent(normalized);
  const candidateBatch = detectBatchFromContent(normalized);
  const candidateModel = detectModelFromContent(normalized);
  const candidateTitle = inferCaseTitleFromInput(normalized);
  const compactCurrentTitle = (currentCaseTitle ?? "").replace(/\s+/g, "");
  const compactCandidateTitle = candidateTitle.replace(/\s+/g, "");

  const customerMismatch = candidateCustomer && currentCustomer && candidateCustomer !== currentCustomer;
  const batchMismatch = candidateBatch && currentBatch && candidateBatch !== currentBatch;
  const modelMismatch = candidateModel && currentModel && candidateModel !== currentModel;
  const titleMismatch =
    compactCandidateTitle.length > 4 &&
    !compactCurrentTitle.includes(compactCandidateTitle.replace(/客诉案件|客诉|案件/g, ""));

  if (customerMismatch || batchMismatch || modelMismatch || titleMismatch) {
    return "needs_case_confirmation";
  }

  return "attach_to_current_case";
}
