import { describe, expect, it, vi } from "vitest";

import {
  getServerAuthState,
  hashPassword,
  isValidUsername,
  normalizeUsername,
  verifyPassword,
} from "@/lib/server/auth";
import { AUTH_COOKIE_NAME } from "@/lib/server/auth-config";

describe("local auth primitives", () => {
  it("normalizes usernames before lookup", () => {
    expect(normalizeUsername("  Alice.Admin  ")).toBe("alice.admin");
  });

  it("accepts only the allowed username shape", () => {
    expect(isValidUsername("alice")).toBe(true);
    expect(isValidUsername("alice_admin-01")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("中文用户名")).toBe(false);
    expect(isValidUsername("alice admin")).toBe(false);
  });

  it("hashes and verifies passwords with scrypt", async () => {
    const hash = await hashPassword("Pin2pin!2026");

    expect(hash).toContain(":");
    await expect(verifyPassword("Pin2pin!2026", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("uses a stable cookie name for auth sessions", () => {
    expect(AUTH_COOKIE_NAME).toBe("fireline_session");
  });

  it("treats expired sessions as unauthenticated", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";

    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        get: () => ({ value: "expired-session-token" }),
      }),
    }));

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: async () => [],
              }),
            }),
          }),
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const state = await auth.getServerAuthState();

    expect(state).toEqual({
      authEnabled: true,
      userId: null,
      isAuthenticated: false,
      username: null,
    });
  });

  it("treats disabled users with a valid session token as unauthenticated", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";

    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        get: () => ({ value: "active-token-disabled-user" }),
      }),
    }));

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: async () => [
                  {
                    userId: "user-disabled",
                    expiresAt: new Date(Date.now() + 60_000),
                    username: "disabled-user",
                    status: "disabled",
                  },
                ],
              }),
            }),
          }),
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const state = await auth.getServerAuthState();

    expect(state).toEqual({
      authEnabled: true,
      userId: null,
      isAuthenticated: false,
      username: null,
    });
  });
});
