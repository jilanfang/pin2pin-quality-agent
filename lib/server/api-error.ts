import { NextResponse } from "next/server";

const ALLOWED_STATUS_CODES = new Set([400, 401, 403, 404, 503]);

export function handleApiRouteError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unexpected error";

  const rawStatus =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : message === "Authentication required"
        ? 401
        : 400;

  const status = ALLOWED_STATUS_CODES.has(rawStatus) ? rawStatus : 500;

  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;

  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status }
  );
}
