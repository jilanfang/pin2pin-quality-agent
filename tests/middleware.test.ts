import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

function createRequest(pathname: string, cookieValue?: string) {
  return {
    url: `http://localhost${pathname}`,
    nextUrl: new URL(`http://localhost${pathname}`),
    cookies: {
      get: (name: string) =>
        name === "fireline_session" && cookieValue ? { value: cookieValue } : undefined,
    },
  } as Parameters<typeof middleware>[0];
}

describe("middleware auth gate", () => {
  it("redirects page requests without a session cookie to /login", async () => {
    const response = await middleware(createRequest("/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("allows page requests through when any session cookie is present", async () => {
    const response = await middleware(createRequest("/investigations/case-1", "stale-token"));

    expect(response.status).toBe(200);
  });

  it("never redirects api routes even when the cookie is missing", async () => {
    const response = await middleware(createRequest("/api/cases"));

    expect(response.status).toBe(200);
  });
});
