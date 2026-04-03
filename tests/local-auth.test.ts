import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAuthSession,
  getRegisterConfig,
  getServerAuthState,
  hashPassword,
  isValidUsername,
  normalizeUsername,
  registerWithUsernamePassword,
  verifyPassword,
} from "@/lib/server/auth";
import { AUTH_COOKIE_NAME } from "@/lib/server/auth-config";

describe("local auth primitives", () => {
  beforeEach(() => {
    delete process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER;
    delete process.env.AI_QUALITY_AUTH_REGISTER_MIN_PASSWORD_LENGTH;
    delete process.env.AI_QUALITY_AUTH_REGISTER_RATE_LIMIT_MAX_ATTEMPTS;
    delete process.env.AI_QUALITY_AUTH_REGISTER_RATE_LIMIT_WINDOW_MS;
    delete process.env.AI_QUALITY_AUTH_REGISTER_INVITE_CODES;
    delete process.env.AI_QUALITY_AUTH_REGISTER_USERNAME_ALLOWLIST;
  });

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

  it("creates a registration session for a valid username and password", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";
    process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER = "true";

    const insertValuesMock = vi.fn(async () => {});
    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
        insert: () => ({
          values: insertValuesMock,
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const result = await auth.registerWithUsernamePassword(" New-User ", "Pin2pin!2026");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.username).toBe("new-user");
      expect(result.sessionToken).toBeTruthy();
    }
    expect(insertValuesMock).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate usernames during registration", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";
    process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER = "true";

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [
                {
                  id: "user-1",
                  username: "alice",
                  passwordHash: "salt:hash",
                  email: null,
                  status: "active",
                },
              ],
            }),
          }),
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const result = await auth.registerWithUsernamePassword("alice", "Pin2pin!2026");

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "用户名已被占用",
    });
  });

  it("rejects too-short passwords during registration", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";
    process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER = "true";

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const result = await auth.registerWithUsernamePassword("alice", "1234567");

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "密码至少需要 8 位",
    });
  });

  it("reads registration config from env with defaults", () => {
    delete process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER;
    delete process.env.AI_QUALITY_AUTH_REGISTER_MIN_PASSWORD_LENGTH;
    delete process.env.AI_QUALITY_AUTH_REGISTER_RATE_LIMIT_MAX_ATTEMPTS;
    delete process.env.AI_QUALITY_AUTH_REGISTER_RATE_LIMIT_WINDOW_MS;
    delete process.env.AI_QUALITY_AUTH_REGISTER_INVITE_CODES;
    delete process.env.AI_QUALITY_AUTH_REGISTER_USERNAME_ALLOWLIST;

    expect(getRegisterConfig()).toEqual({
      allowSelfRegister: false,
      minPasswordLength: 8,
      rateLimitMaxAttempts: 5,
      rateLimitWindowMs: 600000,
      inviteCodes: [],
      usernameAllowlist: [],
    });
  });

  it("rejects registration when self-register is disabled", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";
    process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER = "false";

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const result = await auth.registerWithUsernamePassword("alice", "Pin2pin!2026");

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "当前未开放注册",
    });
  });

  it("rejects registration when the invite code is missing or wrong", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";
    process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER = "true";
    process.env.AI_QUALITY_AUTH_REGISTER_INVITE_CODES = "FIRELINE-INVITE, FL26-DEMO-0001";

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const result = await auth.registerWithUsernamePassword("alice", "Pin2pin!2026", {
      ipAddress: "203.0.113.7",
      inviteCode: "WRONG-CODE",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "邀请码无效",
    });
  });

  it("rejects usernames that are not in the allowlist", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";
    process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER = "true";
    process.env.AI_QUALITY_AUTH_REGISTER_USERNAME_ALLOWLIST = "allowed-user, tester-01";
    delete process.env.AI_QUALITY_AUTH_REGISTER_INVITE_CODES;

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const result = await auth.registerWithUsernamePassword("blocked-user", "Pin2pin!2026", {
      ipAddress: "203.0.113.8",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "当前账号未开放注册",
    });
  });

  it("rate limits repeated registration attempts from the same ip", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://demo";
    process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER = "true";
    process.env.AI_QUALITY_AUTH_REGISTER_RATE_LIMIT_MAX_ATTEMPTS = "1";
    process.env.AI_QUALITY_AUTH_REGISTER_RATE_LIMIT_WINDOW_MS = "600000";
    delete process.env.AI_QUALITY_AUTH_REGISTER_INVITE_CODES;
    delete process.env.AI_QUALITY_AUTH_REGISTER_USERNAME_ALLOWLIST;

    const insertValuesMock = vi.fn(async () => {});
    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
        insert: () => ({
          values: insertValuesMock,
        }),
      }),
    }));

    const auth = await import("@/lib/server/auth");
    const first = await auth.registerWithUsernamePassword("user-one", "Pin2pin!2026", {
      ipAddress: "203.0.113.9",
    });
    const second = await auth.registerWithUsernamePassword("user-two", "Pin2pin!2026", {
      ipAddress: "203.0.113.9",
    });

    expect(first.ok).toBe(true);
    expect(second).toEqual({
      ok: false,
      status: 429,
      error: "注册尝试过于频繁，请稍后再试",
    });
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
