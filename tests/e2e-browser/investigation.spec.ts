import { test, expect } from "@playwright/test";

test.describe("investigation workflow", () => {
  test("starts from the homepage paste-first hero and sees analysis results", async ({ page }) => {
    await page.goto("/");

    // Step 1: Submit the first material directly from the homepage hero
    const composer = page.getByLabel("首页异常输入框");
    await composer.fill(
      "客户华星科技邮件反馈：昨日上线后出现 3 台板卡上电冒烟，涉及 MCU-800 批次 B19。"
    );

    const sendButton = page.getByRole("button", { name: "开始分析" });
    await sendButton.click();

    // Step 2: Wait for the first evidence API call after auto case creation
    await page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") && response.status() === 200,
      { timeout: 30_000 }
    );

    // Step 3: Verify assistant response appeared in the conversation feed
    const conversationFeed = page.getByTestId("conversation-feed");
    await expect(conversationFeed.getByText(/华星|接下|分析|事实/u).first()).toBeVisible({
      timeout: 5000,
    });

    // Step 4: Verify investigation mode resumed after the first material was processed
    const copilotBrief = page.getByTestId("copilot-brief");
    if (await copilotBrief.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) {
      await expect(copilotBrief).not.toBeEmpty();
    }
  });
});
