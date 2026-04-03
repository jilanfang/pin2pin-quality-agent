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

describe("local register route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns 400 for invalid registration payload", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      registerWithUsernamePassword: async () => {
        throw new Error("should not register");
      },
      createSessionCookie: () => {
        throw new Error("should not create cookie");
      },
    }));

    const route = await import("@/app/api/auth/register/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username: "ab", password: "1234567" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBeTruthy();
  });

  it("returns 409 for duplicate usernames", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      registerWithUsernamePassword: async () => ({
        ok: false,
        status: 409,
        error: "用户名已被占用",
      }),
      createSessionCookie: () => {
        throw new Error("should not create cookie");
      },
    }));

    const route = await import("@/app/api/auth/register/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "Pin2pin!2026" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("用户名已被占用");
  });

  it("returns 403 when self-registration is disabled", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      registerWithUsernamePassword: async () => ({
        ok: false,
        status: 403,
        error: "当前未开放注册",
      }),
      createSessionCookie: () => {
        throw new Error("should not create cookie");
      },
    }));

    const route = await import("@/app/api/auth/register/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "Pin2pin!2026" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("当前未开放注册");
  });

  it("returns 429 when registration is rate limited", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      registerWithUsernamePassword: async () => ({
        ok: false,
        status: 429,
        error: "注册尝试过于频繁，请稍后再试",
      }),
      createSessionCookie: () => {
        throw new Error("should not create cookie");
      },
    }));

    const route = await import("@/app/api/auth/register/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7" },
        body: JSON.stringify({ username: "alice", password: "Pin2pin!2026" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.error).toBe("注册尝试过于频繁，请稍后再试");
  });

  it("sets a session cookie after successful registration", async () => {
    const registerMock = vi.fn(async () => ({
      ok: true,
      sessionToken: "registered-session-token",
    }));

    vi.doMock("@/lib/server/auth", () => ({
      registerWithUsernamePassword: registerMock,
      createSessionCookie: () => ({
        name: "fireline_session",
        value: "registered-session-token",
        options: {
          httpOnly: true,
          path: "/",
        },
      }),
    }));

    const route = await import("@/app/api/auth/register/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7" },
        body: JSON.stringify({ username: "new-user", password: "Pin2pin!2026" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("fireline_session=registered-session-token");
    expect(registerMock).toHaveBeenCalledWith("new-user", "Pin2pin!2026", {
      ipAddress: "203.0.113.7",
      inviteCode: undefined,
    });
  });

  it("passes invite codes through to the registration service", async () => {
    const registerMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      error: "邀请码无效",
    }));

    vi.doMock("@/lib/server/auth", () => ({
      registerWithUsernamePassword: registerMock,
      createSessionCookie: () => {
        throw new Error("should not create cookie");
      },
    }));

    const route = await import("@/app/api/auth/register/route");
    const response = await route.POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.9" },
        body: JSON.stringify({
          username: "new-user",
          password: "Pin2pin!2026",
          inviteCode: "FIRELINE-INVITE",
        }),
      })
    );

    expect(response.status).toBe(403);
    expect(registerMock).toHaveBeenCalledWith("new-user", "Pin2pin!2026", {
      ipAddress: "203.0.113.9",
      inviteCode: "FIRELINE-INVITE",
    });
  });
});
