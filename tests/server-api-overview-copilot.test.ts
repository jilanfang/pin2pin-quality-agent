describe("server api overview and copilot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns overview data for authenticated users", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: "user-1",
        isAuthenticated: true,
        email: "ops@example.com",
      }),
      assertAuthenticated: () => undefined,
    }));

    vi.doMock("@/lib/server/api", () => ({
      getOverviewHandler: async () => ({
        stats: {
          activeInvestigations: 1,
          pendingEvidence: 2,
          readyArtifacts: 1,
        },
        recentInvestigations: [],
        artifactHighlights: [],
      }),
    }));

    const route = await import("@/app/api/overview/route");
    const response = await route.GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.stats.activeInvestigations).toBe(1);
  });

  it("returns a stable fallback answer from copilot api when llm is unavailable", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: "user-1",
        isAuthenticated: true,
        email: "ops@example.com",
      }),
      assertAuthenticated: () => undefined,
    }));

    vi.doMock("@/lib/server/api", () => ({
      postCopilotHandler: async () => ({
        answer: "当前未接通在线模型，请先根据既有质量体系与内部规范进行判断。",
      }),
    }));

    const route = await import("@/app/api/copilot/route");
    const response = await route.POST(
      new Request("http://localhost/api/copilot", {
        method: "POST",
        body: JSON.stringify({ prompt: "什么是 8D？" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer).toContain("当前未接通在线模型");
  });
});
