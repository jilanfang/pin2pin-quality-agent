"use client";

import { inferCaseTitleFromInput } from "@/lib/domain/conversation-input";

type InvestigationSummary = {
  id: string;
  title: string;
};

type InvestigationEntryOptions = {
  createTimeoutMs?: number;
  evidenceTimeoutMs?: number;
};

const DEFAULT_ENTRY_CREATE_TIMEOUT_MS = 15_000;
const DEFAULT_ENTRY_EVIDENCE_TIMEOUT_MS = 25_000;

async function readJson(response: Response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(payload.error || "请求失败");
  }
  return response.json();
}

export class InvestigationEntryError extends Error {
  createdCaseId: string | null;

  constructor(message: string, options?: { createdCaseId?: string | null }) {
    super(message);
    this.name = "InvestigationEntryError";
    this.createdCaseId = options?.createdCaseId ?? null;
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    const isAbortError =
      error instanceof DOMException
        ? error.name === "AbortError"
        : error instanceof Error && error.name === "AbortError";

    if (controller.signal.aborted || isAbortError) {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createInvestigationFromInput<TWorkflow = unknown>(
  content: string,
  options?: InvestigationEntryOptions
) {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    throw new InvestigationEntryError("请先输入异常情况");
  }

  const created = (await readJson(
    await fetchWithTimeout(
      "/api/cases",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: inferCaseTitleFromInput(normalizedContent),
        }),
      },
      options?.createTimeoutMs ?? DEFAULT_ENTRY_CREATE_TIMEOUT_MS,
      "创建调查超时，请稍后重试"
    )
  )) as InvestigationSummary;

  try {
    const workflow = (await readJson(
      await fetchWithTimeout(
        `/api/cases/${created.id}/evidence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: normalizedContent,
          }),
        },
        options?.evidenceTimeoutMs ?? DEFAULT_ENTRY_EVIDENCE_TIMEOUT_MS,
        "首条材料处理超时，调查已创建，可先进入调查继续处理。"
      )
    )) as TWorkflow;

    return {
      caseSummary: created,
      workflow,
    };
  } catch (error) {
    throw new InvestigationEntryError(
      error instanceof Error ? error.message : "首条材料提交失败",
      { createdCaseId: created.id }
    );
  }
}
