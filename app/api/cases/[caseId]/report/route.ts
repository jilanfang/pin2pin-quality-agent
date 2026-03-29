import { NextResponse } from "next/server";

import { closeCaseForFinalReport } from "@/lib/server/api";
import { assertAuthenticated, getServerAuthState } from "@/lib/server/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const { caseId } = await context.params;
    const url = new URL(request.url);
    const payload = await closeCaseForFinalReport(caseId, url.searchParams, auth);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required" ? 401 : 409 }
    );
  }
}
