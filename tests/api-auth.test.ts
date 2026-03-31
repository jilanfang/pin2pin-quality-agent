describe("api auth guards", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns 401 from cases api when auth is enabled and no user session exists", async () => {
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

    const route = await import("@/app/api/cases/route");
    const response = await route.GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Authentication required");
  });
});
