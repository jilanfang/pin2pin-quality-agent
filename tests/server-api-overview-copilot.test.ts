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
        username: "ops",
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

  it("returns 401 from overview api when auth is missing", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: null,
        isAuthenticated: false,
        username: null,
      }),
      assertAuthenticated: () => {
        throw new Error("Authentication required");
      },
    }));

    const route = await import("@/app/api/overview/route");
    const response = await route.GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Authentication required");
  });

  it("returns a 503 error from copilot api when llm is unavailable", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: "user-1",
        isAuthenticated: true,
        username: "ops",
      }),
      assertAuthenticated: () => undefined,
    }));

    vi.doMock("@/lib/server/api", () => ({
      postCopilotHandler: async () => {
        throw Object.assign(new Error("当前模型服务不可用，本次调查输入未被处理，请稍后重试。"), {
          code: "llm_required_unavailable",
          status: 503,
        });
      },
    }));

    const route = await import("@/app/api/copilot/route");
    const response = await route.POST(
      new Request("http://localhost/api/copilot", {
        method: "POST",
        body: JSON.stringify({ prompt: "什么是 8D？" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.code).toBe("llm_required_unavailable");
    expect(payload.error).toContain("当前模型服务不可用");
  });

  it("returns 401 from copilot api when auth is missing", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: null,
        isAuthenticated: false,
        username: null,
      }),
      assertAuthenticated: () => {
        throw new Error("Authentication required");
      },
    }));

    const route = await import("@/app/api/copilot/route");
    const response = await route.POST(
      new Request("http://localhost/api/copilot", {
        method: "POST",
        body: JSON.stringify({ prompt: "什么是 8D？" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Authentication required");
  });
});
