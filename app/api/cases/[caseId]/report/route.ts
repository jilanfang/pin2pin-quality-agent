import { NextResponse } from "next/server";

import { closeCaseForFinalReport } from "@/lib/server/api";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const url = new URL(request.url);
    const payload = await closeCaseForFinalReport(caseId, url.searchParams);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
