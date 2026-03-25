import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("provides the sovereign shell as the global app frame", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>layout-child</div>
      </RootLayout>
    );

    expect(markup).toContain('data-testid="sovereign-shell"');
    expect(markup).toContain("Pin2pin Fireline");
    expect(markup).toContain('aria-label="主导航"');
    expect(markup).toContain('aria-label="工具侧栏"');
    expect(markup).toContain('aria-label="报告侧栏"');
    expect(markup).toContain("layout-child");
    expect(markup).not.toContain("Anomalies");
    expect(markup).not.toContain("Insights");
    expect(markup).not.toContain("History");
    expect(markup).not.toContain("Search logs...");
  });
});
