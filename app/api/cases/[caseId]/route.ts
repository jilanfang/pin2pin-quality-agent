import { NextResponse } from "next/server";

import { getCaseHandler } from "@/lib/server/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const payload = await getCaseHandler(caseId);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 404 }
    );
  }
}
