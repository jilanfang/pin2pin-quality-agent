import { NextResponse } from "next/server";

import { postEvidenceHandler } from "@/lib/server/api";
import { handleApiRouteError } from "@/lib/server/api-error";
import { assertAuthenticated, getServerAuthState } from "@/lib/server/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const { caseId } = await context.params;
    const body = await request.json();
    const payload = await postEvidenceHandler(caseId, body, auth);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiRouteError(error);
  }
}
