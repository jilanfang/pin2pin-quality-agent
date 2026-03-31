describe("local login route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns 401 for invalid credentials", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      loginWithUsernamePassword: async () => ({
        ok: false,
        status: 401,
        error: "用户名或密码错误",
      }),
      createSessionCookie: () => {
        throw new Error("should not create cookie");
      },
    }));

    const route = await import("@/app/api/auth/login/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "wrong-password" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("用户名或密码错误");
  });

  it("returns 403 for disabled users", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      loginWithUsernamePassword: async () => ({
        ok: false,
        status: 403,
        error: "账号已停用",
      }),
      createSessionCookie: () => {
        throw new Error("should not create cookie");
      },
    }));

    const route = await import("@/app/api/auth/login/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "Pin2pin!2026" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("账号已停用");
  });

  it("sets a session cookie after successful login", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      loginWithUsernamePassword: async () => ({
        ok: true,
        sessionToken: "plain-session-token",
      }),
      createSessionCookie: () => ({
        name: "fireline_session",
        value: "plain-session-token",
        options: {
          httpOnly: true,
          path: "/",
        },
      }),
    }));

    const route = await import("@/app/api/auth/login/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "Pin2pin!2026" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("fireline_session=plain-session-token");
  });
});
