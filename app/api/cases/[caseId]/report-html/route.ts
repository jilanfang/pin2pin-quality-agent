import { reportHtmlHandler } from "@/lib/server/api";

export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const url = new URL(request.url);
    const html = await reportHtmlHandler(caseId, url.searchParams);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Unexpected error", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
