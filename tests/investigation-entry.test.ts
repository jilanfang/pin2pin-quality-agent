import { afterEach, describe, expect, it, vi } from "vitest";

import {
  InvestigationEntryError,
  createInvestigationFromInput,
} from "@/lib/client/investigation-entry";

describe("createInvestigationFromInput", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("times out the first evidence submission and keeps the created case id for recovery", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/cases") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "case-timeout-1",
              title: "发现上电冒烟客诉",
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/cases/case-timeout-1/evidence") {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
        });
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock);

    const pending = createInvestigationFromInput("客户反馈 B12 批次 3 台板卡上电冒烟。", {
      evidenceTimeoutMs: 50,
    });
    const assertion = expect(pending).rejects.toEqual(
      expect.objectContaining<Partial<InvestigationEntryError>>({
        name: "InvestigationEntryError",
        message: "首条材料处理超时，调查已创建，可先进入调查继续处理。",
        createdCaseId: "case-timeout-1",
      })
    );

    await vi.advanceTimersByTimeAsync(60);
    await assertion;

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/cases/case-timeout-1/evidence",
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
      })
    );
  });
});
