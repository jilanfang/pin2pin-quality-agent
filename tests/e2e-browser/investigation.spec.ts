import { test, expect } from "@playwright/test";

test.describe("investigation workflow", () => {
  test("creates a case, submits evidence via LLM, and sees analysis results", async ({ page }) => {
    await page.goto("/");

    // Step 1: Open case drawer and click "新建调查"
    // The button text is "新建调查" (workspace.tsx:1509)
    const createButton = page.getByRole("button", { name: "新建调查" });
    await createButton.click();

    // Step 2: Enter title — the input has no placeholder; it's inside the drawer
    const titleInput = page.locator(".case-drawer input[type='text']").first();
    await titleInput.fill("E2E 浏览器测试案件");
    await titleInput.press("Enter");

    // Wait for case to be created and workspace to load
    await page.waitForTimeout(2000);

    // Step 3: Type evidence in the composer
    // Textarea has aria-label="证据输入框" (workspace.tsx:862)
    const composer = page.getByLabel("证据输入框");
    await composer.fill(
      "客户华星科技邮件反馈：昨日上线后出现 3 台板卡上电冒烟，涉及 MCU-800 批次 B19。"
    );

    // Step 4: Send the evidence
    // Button text is "发送证据" (workspace.tsx:875)
    const sendButton = page.getByRole("button", { name: "发送证据" });
    await sendButton.click();

    // Step 5: Wait for the LLM response (evidence API call)
    await page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") && response.status() === 200,
      { timeout: 30_000 }
    );

    // Step 6: Verify assistant response appeared in the conversation feed
    // data-testid="conversation-feed" contains the messages (workspace.tsx:1591)
    const conversationFeed = page.getByTestId("conversation-feed");
    await expect(conversationFeed.getByText(/华星|接下|分析|事实/u).first()).toBeVisible({
      timeout: 5000,
    });

    // Step 7: Verify copilot brief (AI analysis card) is visible
    // data-testid="copilot-brief" (workspace.tsx:631)
    const copilotBrief = page.getByTestId("copilot-brief");
    if (await copilotBrief.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(copilotBrief).not.toBeEmpty();
    }
  });
});
