import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionCookie, loginWithUsernamePassword } from "@/lib/server/auth";
import { handleApiRouteError } from "@/lib/server/api-error";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const result = await loginWithUsernamePassword(body.username, body.password);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(createSessionCookie(result.sessionToken));
    return response;
  } catch (error) {
    return handleApiRouteError(error);
  }
}
