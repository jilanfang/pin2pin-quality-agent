import { NextResponse } from "next/server";

import { deleteCaseHandler, getCaseHandler, updateCaseHandler } from "@/lib/server/api";
import { assertAuthenticated, getServerAuthState } from "@/lib/server/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const { caseId } = await context.params;
    const payload = await getCaseHandler(caseId, auth);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required" ? 401 : 404 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const { caseId } = await context.params;
    const body = await request.json();
    const payload = await updateCaseHandler(caseId, body, auth);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required" ? 401 : 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const { caseId } = await context.params;
    const payload = await deleteCaseHandler(caseId, auth);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required" ? 401 : 404 }
    );
  }
}
