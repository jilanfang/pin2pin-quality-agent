import { NextResponse } from "next/server";

import { stageActionHandler } from "@/lib/server/api";
import type { WorkflowStage } from "@/lib/domain/types";

function isWorkflowStage(value: string): value is WorkflowStage {
  return ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"].includes(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string; stage: string }> }
) {
  try {
    const { caseId, stage } = await context.params;
    if (!isWorkflowStage(stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    const body = await request.json();
    const payload = await stageActionHandler(caseId, stage, "confirm", body);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message.includes("Impacted") ? 409 : 400 });
  }
}
