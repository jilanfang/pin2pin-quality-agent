import { NextResponse } from "next/server";

import { getOverviewHandler } from "@/lib/server/api";
import { assertAuthenticated, getServerAuthState } from "@/lib/server/auth";

export async function GET() {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const payload = await getOverviewHandler(auth);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required" ? 401 : 400 }
    );
  }
}
