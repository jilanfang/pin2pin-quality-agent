import { NextResponse } from "next/server";

import { reportPreviewHandler } from "@/lib/server/api";

export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const url = new URL(request.url);
    const payload = await reportPreviewHandler(caseId, url.searchParams);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 }
    );
  }
}
