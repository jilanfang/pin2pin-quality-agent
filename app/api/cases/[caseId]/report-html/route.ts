import { reportHtmlHandler } from "@/lib/server/api";
import { assertAuthenticated, getServerAuthState } from "@/lib/server/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const auth = await getServerAuthState();
    assertAuthenticated(auth);
    const { caseId } = await context.params;
    const url = new URL(request.url);
    const html = await reportHtmlHandler(caseId, url.searchParams, auth);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, {
      status: message === "Authentication required" ? 401 : 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
