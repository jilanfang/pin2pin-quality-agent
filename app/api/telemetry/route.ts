import { NextResponse } from "next/server";

import { postTelemetryHandler } from "@/lib/server/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await postTelemetryHandler(body);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 }
    );
  }
}
