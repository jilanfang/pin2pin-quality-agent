import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

describe("middleware auth allowlist", () => {
  it("allows the register endpoint without redirecting to login", async () => {
    const request = {
      nextUrl: { pathname: "/api/auth/register" },
      url: "http://localhost/api/auth/register",
      cookies: {
        get: () => undefined,
      },
    } as Parameters<typeof middleware>[0];

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });
});
