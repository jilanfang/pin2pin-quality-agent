import { NextResponse } from "next/server";

import { postFeedbackHandler } from "@/lib/server/api";
import { assertAuthenticated, getServerAuthState } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const body = await request.json();
    await postFeedbackHandler(body);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required" ? 401 : 400 }
    );
  }
}
