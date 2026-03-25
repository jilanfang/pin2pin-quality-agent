import { NextResponse } from "next/server";

import { createCaseHandler, listCasesHandler } from "@/lib/server/api";

export async function GET() {
  const payload = await listCasesHandler();
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await createCaseHandler(body);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 }
    );
  }
}
