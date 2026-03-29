import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import CopilotPage from "@/app/copilot/page";

describe("CopilotPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the 8D and quality copilot entrypoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ answer: "", suggestions: [] }), { status: 200 }))
    );

    const page = await CopilotPage();
    render(page);

    expect(screen.getByRole("heading", { name: "8D / 质量方法助手" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explain the 8D methodology step by step" })).toBeInTheDocument();
    expect(screen.getByLabelText("方法助手输入框")).toBeInTheDocument();
  });

  it("submits a copilot question and renders the answer", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/copilot") {
        return new Response(
          JSON.stringify({
            answer: "8D 的核心不是填表，而是跨团队推进问题闭环。",
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const page = await CopilotPage();
    render(page);

    fireEvent.change(screen.getByLabelText("方法助手输入框"), {
      target: { value: "Explain the 8D methodology step by step" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送问题" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/copilot",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    expect(
      await screen.findByText("8D 的核心不是填表，而是跨团队推进问题闭环。")
    ).toBeInTheDocument();
  });
});
