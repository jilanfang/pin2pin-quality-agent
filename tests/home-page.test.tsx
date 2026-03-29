import React from "react";
import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

function stubHomePageFetch(hasItems = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/overview") {
        return new Response(
          JSON.stringify({
            stats: {
              activeInvestigations: hasItems ? 2 : 0,
              pendingEvidence: hasItems ? 3 : 0,
              readyArtifacts: hasItems ? 1 : 0,
            },
            recentInvestigations: hasItems
              ? [
                  {
                    id: "case-1",
                    title: "钽电容反向贴装客诉",
                    stageLabel: "D3 临时遏制",
                    statusLabel: "进行中",
                    updatedAtLabel: "03/22 12:00",
                    href: "/investigations/case-1",
                  },
                ]
              : [],
            artifactHighlights: hasItems
              ? [
                  {
                    caseId: "case-1",
                    caseTitle: "钽电容反向贴装客诉",
                    artifactKind: "analysis_summary",
                    artifactLabel: "分析结论",
                    href: "/investigations/case-1?preview=analysis_summary",
                  },
                ]
              : [],
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    })
  );
}

describe("HomePage", () => {
  it("renders the overview entrypoint instead of the investigation workspace", async () => {
    stubHomePageFetch(true);

    const page = await HomePage();
    render(page);

    await screen.findByRole("heading", { name: "把现场碎片，推进成可交付调查" });

    expect(screen.getByRole("button", { name: "开始新调查" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "继续最近调查" })).toHaveAttribute(
      "href",
      "/investigations/case-1"
    );
    expect(screen.getByText("最近调查")).toBeInTheDocument();
    expect(screen.getByText("方法助手")).toBeInTheDocument();
    expect(screen.queryByText("Fireline Workspace")).not.toBeInTheDocument();
  });

  it("renders an empty overview state when no investigations exist yet", async () => {
    stubHomePageFetch(false);

    const page = await HomePage();
    render(page);

    await screen.findByRole("heading", { name: "把现场碎片，推进成可交付调查" });

    expect(screen.getByText("还没有调查，先开始新调查。")).toBeInTheDocument();
    expect(screen.queryByText("钽电容反向贴装客诉")).not.toBeInTheDocument();
    expect(screen.queryByText("分析结论")).not.toBeInTheDocument();
  });
});
