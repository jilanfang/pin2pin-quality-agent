import { describe, expect, it } from "vitest";

import {
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
});
