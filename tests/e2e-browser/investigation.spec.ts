import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const SMOKE_USERNAME = process.env.SMOKE_AUTH_USERNAME || "fireline-demo-01";
const SMOKE_PASSWORD = process.env.SMOKE_AUTH_PASSWORD || "Pin2pin!2026";
const AUTH_COOKIE_NAME = "fireline_session";

function uniqueLabel(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function waitForAuthCookie(page: Page) {
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some((cookie) => cookie.name === AUTH_COOKIE_NAME);
    })
    .toBe(true);
}

async function waitForWorkspaceReady(page: Page) {
  await page.waitForURL((url) => url.pathname.startsWith("/investigations/"), { timeout: 30_000 });
  await expect(page.getByTestId("conversation-feed")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("insight-column")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "编辑调查标题" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "编辑调查标题" })).not.toHaveText("正在载入调查…", {
    timeout: 30_000,
  });
}

async function loginIfNeeded(page: Page) {
  await page.goto("/");

  if (!page.url().includes("/login")) {
    return;
  }

  await page.getByLabel("用户名").fill(SMOKE_USERNAME);
  await page.getByLabel("密码").fill(SMOKE_PASSWORD);
  await Promise.all([
    page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "登录" }).click(),
  ]);
  await waitForAuthCookie(page);
  await page.waitForLoadState("networkidle");
}

async function createInvestigationFromHomepage(page: Page, content: string) {
  await loginIfNeeded(page);
  await page.goto("/");

  const composer = page.getByLabel("首页异常输入框");
  const evidenceResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/evidence") &&
      response.request().method() === "POST" &&
      response.status() === 200,
    { timeout: 30_000 }
  );

  await composer.fill(content);

  await Promise.all([
    page.getByRole("button", { name: "开始分析" }).click(),
    evidenceResponsePromise,
  ]);
  await waitForWorkspaceReady(page);
}

async function openCreateDrawer(page: Page) {
  const sidebar = page.getByTestId("case-sidebar");
  const toggleButton = sidebar.getByRole("button", { name: /新建调查|收起新建/ });
  await toggleButton.click();
  await expect(sidebar.getByLabel("调查标题")).toBeVisible();
}

async function createBlankCaseFromSidebar(page: Page, title: string) {
  const sidebar = page.getByTestId("case-sidebar");
  await openCreateDrawer(page);
  await sidebar.getByLabel("调查标题").fill(title);
  await sidebar.getByLabel("种子案例").selectOption("");

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/cases") &&
      response.request().method() === "POST" &&
      response.status() === 200,
    { timeout: 30_000 }
  );

  await sidebar.getByRole("button", { name: "创建调查" }).click();
  const response = await createResponsePromise;
  const payload = (await response.json()) as { id: string; title: string };

  await waitForWorkspaceReady(page);
  await expect(page.getByRole("button", { name: "编辑调查标题" })).toHaveText(title, {
    timeout: 30_000,
  });
  return payload;
}

test.describe("investigation workflow", () => {
  test("shows a login error, then allows retrying with the issued username and password", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("用户名").fill("fireline-demo-01");
    await page.getByLabel("密码").fill("wrong-password");
    await page.getByRole("button", { name: "登录" }).click();

    await expect(page.getByText("用户名或密码错误")).toBeVisible();

    await page.getByLabel("用户名").fill(SMOKE_USERNAME);
    await page.getByLabel("密码").fill(SMOKE_PASSWORD);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 }),
      page.getByRole("button", { name: "登录" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "把客户投诉或异常情况贴进来" })).toBeVisible();
  });

  test("redirects an authenticated user away from /login", async ({ page }) => {
    await loginIfNeeded(page);
    const redirectedPage = await page.context().newPage();
    await redirectedPage.goto("/login");
    await redirectedPage.waitForLoadState("networkidle");

    await expect(redirectedPage).not.toHaveURL(/\/login$/);
    await expect(redirectedPage.getByRole("heading", { name: "把客户投诉或异常情况贴进来" })).toBeVisible();
    await redirectedPage.close();
  });

  test("blocks empty homepage submit and only creates one investigation on rapid repeated clicks", async ({
    page,
  }) => {
    await loginIfNeeded(page);
    await page.goto("/");

    const sendButton = page.getByRole("button", { name: "开始分析" });
    await expect(sendButton).toBeDisabled();

    const longContent = [
      "客户广硕电子邮件投诉：昨晚夜班上线后，MCU-810 板卡连续 3 台上电冒烟。",
      "现场补充：异常集中在 B19 和 B20 两个批次，客户端已暂停投线并要求今天先给止血口径。",
      "工厂补充：成品库存 186 台，在制品 74 台，昨晚 22:10 到今早 01:20 共出现 4 起异常。",
      "测试结论：常温上电 2 秒内复现，失效位初判在输入端钽电容附近，仍待显微确认。",
    ].join("\n\n");

    let createRequests = 0;
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (request.method() === "POST" && pathname === "/api/cases") {
        createRequests += 1;
      }
    });

    await page.getByLabel("首页异常输入框").fill(longContent);
    await sendButton.dblclick({ delay: 10 });

    expect(createRequests).toBe(1);
    await waitForWorkspaceReady(page);
  });

  test("starts from the homepage paste-first hero and sees analysis results", async ({ page }) => {
    await createInvestigationFromHomepage(
      page,
      "客户华星科技邮件反馈：昨日上线后出现 3 台板卡上电冒烟，涉及 MCU-800 批次 B19。"
    );

    const conversationFeed = page.getByTestId("conversation-feed");
    await expect(conversationFeed.getByText(/华星|接下|分析|事实/u).first()).toBeVisible({
      timeout: 5000,
    });

    const copilotBrief = page.getByTestId("copilot-brief");
    if (await copilotBrief.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) {
      await expect(copilotBrief).not.toBeEmpty();
    }
  });

  test("keeps the desktop investigation workspace in a stable three-column layout", async ({ page }) => {
    await createInvestigationFromHomepage(
      page,
      "客户反馈昨晚切换电源后连续 2 台板卡冒烟，涉及 MCU-900 批次 C21，已通知暂停出货。"
    );

    const sidebar = page.getByTestId("case-sidebar");
    const conversationFeed = page.getByTestId("conversation-feed");
    const insightColumn = page.getByTestId("insight-column");
    const composerDock = page.getByTestId("composer-dock");

    await expect(sidebar).toBeVisible();
    await expect(conversationFeed).toBeVisible();
    await expect(insightColumn).toBeVisible();
    await expect(composerDock).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const feedBox = await conversationFeed.boundingBox();
    const insightBox = await insightColumn.boundingBox();
    const composerBox = await composerDock.boundingBox();
    expect(sidebarBox).toBeTruthy();
    expect(feedBox).toBeTruthy();
    expect(insightBox).toBeTruthy();
    expect(composerBox).toBeTruthy();

    if (!sidebarBox || !feedBox || !insightBox || !composerBox) {
      throw new Error("Workspace columns did not render expected bounding boxes.");
    }

    expect(sidebarBox.x).toBeLessThan(feedBox.x);
    expect(feedBox.x).toBeLessThan(insightBox.x);
    expect(composerBox.y).toBeGreaterThan(feedBox.y);
  });

  test("keeps the last message visible above the docked composer and supports centered title editing", async ({
    page,
  }) => {
    await createInvestigationFromHomepage(
      page,
      "客户投诉：MCU-801 批次 D12 上电冒烟，现场已经停线，客户要求今天先给止血方案。"
    );

    const titleButton = page.getByRole("button", { name: "编辑调查标题" });
    await expect(titleButton).toBeVisible();
    await titleButton.click();

    const titleInput = page.getByLabel("调查标题输入框");
    await titleInput.fill("客户停线冒烟调查");
    await titleInput.press("Enter");
    await expect(page.getByRole("button", { name: "编辑调查标题" })).toHaveText("客户停线冒烟调查", {
      timeout: 30_000,
    });

    const dockComposer = page.getByLabel("证据输入框").last();
    await page.getByRole("button", { name: "展开输入框" }).click();
    const secondEvidenceResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") &&
        response.request().method() === "POST" &&
        response.status() === 200,
      { timeout: 30_000 }
    );
    await dockComposer.fill(
      "补充：客户端已冻结现场库存，工厂这边也暂停投线。请先给我一版对客户的回复口径，并说明下一步要补哪些事实。"
    );
    await page.getByRole("button", { name: "发送证据" }).last().click();
    await secondEvidenceResponsePromise;

    const conversationFeed = page.getByTestId("conversation-feed");
    const composerDock = page.getByTestId("composer-dock");
    const lastMessage = conversationFeed.locator(".message-card").last();

    await expect(lastMessage).toBeVisible({ timeout: 10_000 });

    const feedBox = await conversationFeed.boundingBox();
    const composerBox = await composerDock.boundingBox();
    const messageBox = await lastMessage.boundingBox();
    expect(feedBox).toBeTruthy();
    expect(composerBox).toBeTruthy();
    expect(messageBox).toBeTruthy();

    if (!feedBox || !composerBox || !messageBox) {
      throw new Error("Missing bounding boxes for feed/composer/message.");
    }

    expect(messageBox.y + messageBox.height).toBeLessThanOrEqual(composerBox.y + 2);
  });

  test("cancels title edits with Esc and saves the title on blur", async ({ page }) => {
    const savedTitle = uniqueLabel("客户停线调查");
    await createInvestigationFromHomepage(
      page,
      "客户投诉：MCU-805 昨晚夜班上电后冒烟，要求今天给一版对客说明。"
    );

    const titleButton = page.getByRole("button", { name: "编辑调查标题" });
    const originalTitle = (await titleButton.textContent())?.trim() ?? "";

    await titleButton.click();
    const titleInput = page.getByLabel("调查标题输入框");
    await titleInput.fill("这次修改不保存");
    await titleInput.press("Escape");
    await expect(page.getByRole("button", { name: "编辑调查标题" })).toHaveText(originalTitle);

    await titleButton.click();
    await titleInput.fill(savedTitle);
    await page.getByRole("banner").click();

    await expect(page.getByRole("button", { name: "编辑调查标题" })).toHaveText(savedTitle, {
      timeout: 30_000,
    });
    await expect(page.getByTestId("case-sidebar").locator(".case-card", { hasText: savedTitle }).first()).toBeVisible();
  });

  test("keeps the latest selected case active when switching quickly between investigations", async ({
    page,
  }) => {
    const firstTitle = uniqueLabel("切换测试-A");
    const secondTitle = uniqueLabel("切换测试-B");

    await createInvestigationFromHomepage(
      page,
      "客户投诉：MCU-810 夜班上电冒烟，先建一个工作台案例供后续切换测试。"
    );

    const firstCase = await createBlankCaseFromSidebar(page, firstTitle);
    const secondCase = await createBlankCaseFromSidebar(page, secondTitle);

    await page.route(`**/api/cases/${firstCase.id}`, async (route) => {
      if (route.request().method() === "GET") {
        await page.waitForTimeout(1200);
      }
      await route.continue();
    });

    const sidebar = page.getByTestId("case-sidebar");
    await sidebar.locator(".case-card", { hasText: firstTitle }).first().click();
    await sidebar.locator(".case-card", { hasText: secondTitle }).first().click();

    await expect(page.getByRole("button", { name: "编辑调查标题" })).toHaveText(secondTitle, {
      timeout: 30_000,
    });
    await expect(sidebar.locator(".case-card.active", { hasText: secondTitle }).first()).toBeVisible();

    await page.unroute(`**/api/cases/${firstCase.id}`);

    expect(firstCase.id).not.toBe(secondCase.id);
  });
});
