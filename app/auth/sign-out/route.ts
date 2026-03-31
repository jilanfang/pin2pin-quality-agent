import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/server/auth-config";
import {
  createClearedSessionCookie,
  revokeSession,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionToken =
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.slice(`${AUTH_COOKIE_NAME}=`.length) ?? null;

  if (sessionToken) {
    await revokeSession(sessionToken);
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  const clearedCookie = createClearedSessionCookie();
  response.cookies.set(clearedCookie);
  return response;
}
