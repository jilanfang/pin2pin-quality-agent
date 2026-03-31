"use client";

import { inferCaseTitleFromInput } from "@/lib/domain/conversation-input";

type InvestigationSummary = {
  id: string;
  title: string;
};

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

export async function createInvestigationFromInput<TWorkflow = unknown>(content: string) {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    throw new InvestigationEntryError("请先输入异常情况");
  }

  const created = (await readJson(
    await fetch("/api/cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: inferCaseTitleFromInput(normalizedContent),
      }),
    })
  )) as InvestigationSummary;

  try {
    const workflow = (await readJson(
      await fetch(`/api/cases/${created.id}/evidence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: normalizedContent,
        }),
      })
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
