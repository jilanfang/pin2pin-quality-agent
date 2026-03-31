describe("local sign-out route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("clears the auth cookie and redirects to login", async () => {
    const revokeSession = vi.fn(async () => undefined);

    vi.doMock("@/lib/server/auth", () => ({
      AUTH_COOKIE_NAME: "fireline_session",
      revokeSession,
      createClearedSessionCookie: () => ({
        name: "fireline_session",
        value: "",
        path: "/",
        expires: new Date(0),
        httpOnly: true,
      }),
    }));

    const route = await import("@/app/auth/sign-out/route");
    const response = await route.POST(
      new Request("http://localhost/auth/sign-out", {
        method: "POST",
        headers: {
          cookie: "fireline_session=plain-session-token",
        },
      })
    );

    expect(revokeSession).toHaveBeenCalledWith("plain-session-token");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(response.headers.get("set-cookie")).toContain("fireline_session=");
  });
});
