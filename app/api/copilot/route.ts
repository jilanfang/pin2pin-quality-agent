import { NextResponse } from "next/server";

import { postCopilotHandler } from "@/lib/server/api";
import { handleApiRouteError } from "@/lib/server/api-error";
import { assertAuthenticated, getServerAuthState } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const body = await request.json();
    const payload = await postCopilotHandler(body);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiRouteError(error);
  }
}
