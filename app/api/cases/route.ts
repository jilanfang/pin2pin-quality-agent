import { NextResponse } from "next/server";

import { createCaseHandler, listCasesHandler } from "@/lib/server/api";
import { assertAuthenticated, getServerAuthState } from "@/lib/server/auth";

export async function GET() {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const payload = await listCasesHandler(auth);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Authentication required" ? 401 : 400 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const body = await request.json();
    const payload = await createCaseHandler(body, auth);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required" ? 401 : 400 }
    );
  }
}
