import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.AI_QUALITY_LLM_ENABLED;
  delete process.env.AI_QUALITY_LLM_BASE_URL;
  delete process.env.AI_QUALITY_LLM_API_KEY;
  delete process.env.AI_QUALITY_LLM_PROVIDER;
  delete process.env.AI_QUALITY_LLM_EXTRACT_PRIMARY_PROVIDER;
  delete process.env.AI_QUALITY_LLM_EXTRACT_PRIMARY_MODEL;
  delete process.env.AI_QUALITY_LLM_EXTRACT_FALLBACK_PROVIDER;
  delete process.env.AI_QUALITY_LLM_EXTRACT_FALLBACK_MODEL;
  delete process.env.AI_QUALITY_LLM_COPILOT_PRIMARY_PROVIDER;
  delete process.env.AI_QUALITY_LLM_COPILOT_PRIMARY_MODEL;
  delete process.env.AI_QUALITY_LLM_COPILOT_FALLBACK_PROVIDER;
  delete process.env.AI_QUALITY_LLM_COPILOT_FALLBACK_MODEL;
  delete process.env.AI_QUALITY_LLM_REPORT_PRIMARY_PROVIDER;
  delete process.env.AI_QUALITY_LLM_REPORT_PRIMARY_MODEL;
  delete process.env.AI_QUALITY_LLM_REPORT_FALLBACK_PROVIDER;
  delete process.env.AI_QUALITY_LLM_REPORT_FALLBACK_MODEL;
  delete process.env.AI_QUALITY_LLM_FALLBACK_PROVIDER;
  delete process.env.DASHSCOPE_API_KEY;
  delete process.env.AI_QUALITY_ARK_BASE_URL;
  delete process.env.AI_QUALITY_ARK_API_KEY;
  delete process.env.AI_QUALITY_ARK_MODEL;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.AI_QUALITY_LLM_MODEL_EXTRACT;
});

describe("llm adapter", () => {
  it("prefers extract-specific primary provider and model over generic llm defaults", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";
    process.env.AI_QUALITY_LLM_EXTRACT_PRIMARY_PROVIDER = "deepseek";
    process.env.AI_QUALITY_LLM_EXTRACT_PRIMARY_MODEL = "deepseek-v3.2";

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                  assumptions: [],
                  riskFlags: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining(`"model":"deepseek-v3.2"`),
      })
    );
  });

  it("uses extract-specific cross-provider fallback when the primary provider fails", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";
    process.env.AI_QUALITY_ARK_API_KEY = "ark-key";
    process.env.AI_QUALITY_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";
    process.env.AI_QUALITY_LLM_EXTRACT_PRIMARY_PROVIDER = "deepseek";
    process.env.AI_QUALITY_LLM_EXTRACT_PRIMARY_MODEL = "deepseek-v3.2";
    process.env.AI_QUALITY_LLM_EXTRACT_FALLBACK_PROVIDER = "ark";
    process.env.AI_QUALITY_LLM_EXTRACT_FALLBACK_MODEL = "ark-code-latest";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream error", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    knownFacts: [{ field: "model", value: "MCU-800", confidence: 0.95 }],
                    assumptions: [],
                    riskFlags: [],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    const result = await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining(`"model":"deepseek-v3.2"`),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining(`"model":"ark-code-latest"`),
      })
    );
    expect(result?.knownFacts.find((item) => item.field === "model")?.value).toBe("MCU-800");
  });

  it("falls back to the recommended extract model for generic OpenAI-compatible gateways", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                  assumptions: [],
                  riskFlags: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining(`"model":"qwen3.5-122b-a10b"`),
      })
    );
  });

  it("calls qwen through an OpenAI-compatible endpoint and parses extraction json", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.DASHSCOPE_API_KEY = "test-key";
    process.env.AI_QUALITY_LLM_MODEL_EXTRACT = "qwen-plus";

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  knownFacts: [
                    { field: "customer", value: "大麦科技", confidence: 0.96 },
                    { field: "model", value: "MCU-800", confidence: 0.95 },
                  ],
                  assumptions: [],
                  riskFlags: ["客户停线级异常，需持续复审。"],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    const result = await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      })
    );
    expect(result?.knownFacts.find((item) => item.field === "customer")?.value).toBe("大麦科技");
    expect(result?.knownFacts.find((item) => item.field === "model")?.value).toBe("MCU-800");
  });

  it("prefers generic api key and base url overrides when provided", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai";
    process.env.AI_QUALITY_LLM_MODEL_EXTRACT = "qwen3.5-plus";

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                  assumptions: [],
                  riskFlags: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer generic-key",
        }),
      })
    );
  });

  it("does not duplicate /v1 when the generic base url already includes it", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";
    process.env.AI_QUALITY_LLM_MODEL_EXTRACT = "qwen3.5-plus";

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                  assumptions: [],
                  riskFlags: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.any(Object)
    );
  });

  it("falls back to the recommended deepseek analysis model when provider-specific config is used", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "deepseek-key";

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                  assumptions: [],
                  riskFlags: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining(`"model":"deepseek-v3.2-exp"`),
      })
    );
  });

  it("supports the ark provider with a direct chat completions endpoint", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "ark";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_ARK_API_KEY = "ark-key";
    process.env.AI_QUALITY_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                  assumptions: [],
                  riskFlags: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ark-key",
        }),
        body: expect.stringContaining(`"model":"ark-code-latest"`),
      })
    );
  });

  it("falls back from qwen to ark when the primary provider fails", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_ARK_API_KEY = "ark-key";
    process.env.AI_QUALITY_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream error", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                    assumptions: [],
                    riskFlags: [],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    const result = await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions",
      expect.any(Object)
    );
    expect(result?.knownFacts.find((item) => item.field === "customer")?.value).toBe("大麦科技");
  });

  it("falls back from ark to qwen when the primary provider fails", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "ark";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_ARK_API_KEY = "ark-key";
    process.env.AI_QUALITY_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream error", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    knownFacts: [{ field: "model", value: "MCU-800", confidence: 0.95 }],
                    assumptions: [],
                    riskFlags: [],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    const result = await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.any(Object)
    );
    expect(result?.knownFacts.find((item) => item.field === "model")?.value).toBe("MCU-800");
  });

  it("logs provider failure and fallback success when the primary provider request fails", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_ARK_API_KEY = "ark-key";
    process.env.AI_QUALITY_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream error", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                    assumptions: [],
                    riskFlags: [],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    const result = await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(result?.knownFacts.find((item) => item.field === "customer")?.value).toBe("大麦科技");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm][extract][primary][qwen] request_failed")
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm][extract][fallback][ark] recovered_via_fallback")
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs provider_unconfigured and fallback_exhausted when no configured route can run", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "ark";
    process.env.AI_QUALITY_LLM_EXTRACT_FALLBACK_PROVIDER = "qwen";

    const fetchMock = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    const result = await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm][extract][primary][ark] provider_unconfigured")
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm][extract][fallback][qwen] provider_unconfigured")
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm][extract] fallback_exhausted")
    );
  });

  it("logs non_json_response when the provider returns invalid extraction content", async () => {
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.AI_QUALITY_LLM_API_KEY = "generic-key";
    process.env.AI_QUALITY_LLM_BASE_URL = "https://api.vectorengine.ai/v1";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "not-json",
              },
            },
          ],
        }),
        { status: 200 }
      )
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    const { extractEvidenceWithLlm } = await import("@/lib/server/llm");
    const result = await extractEvidenceWithLlm({
      content: "客户大麦科技反馈 MCU-800 产线停线。",
      contextStage: "D2",
    });

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm][extract][primary][qwen] non_json_response")
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm][extract] fallback_exhausted")
    );
  });
});
