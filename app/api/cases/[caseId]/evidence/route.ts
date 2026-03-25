import { NextResponse } from "next/server";

import { postEvidenceHandler } from "@/lib/server/api";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await request.json();
    const payload = await postEvidenceHandler(caseId, body);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 }
    );
  }
}
