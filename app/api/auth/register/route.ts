import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionCookie, registerWithUsernamePassword } from "@/lib/server/auth";
import { handleApiRouteError } from "@/lib/server/api-error";

const registerSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  inviteCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const result = await registerWithUsernamePassword(body.username, body.password, {
      ipAddress: request.headers.get("x-forwarded-for"),
      inviteCode: body.inviteCode,
    });

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
