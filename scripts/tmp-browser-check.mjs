import { chromium } from "@playwright/test";

const BASE_URL = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3001";
const INVITE_CODE = process.env.SMOKE_INVITE_CODE || "FL26-49E2-8012";

function uniqueUsername() {
  return `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function expectVisible(locator, label) {
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  console.log(`PASS: ${label}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const username = uniqueUsername();
  const password = "Pin2pin!2026";
  const apiEvents = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`BROWSER_CONSOLE_ERROR: ${msg.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    console.error(`PAGE_ERROR: ${String(error)}`);
  });

  page.on("request", (request) => {
    if (request.url().includes("/api/")) {
      apiEvents.push(`REQ ${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  page.on("response", async (response) => {
    if (response.url().includes("/api/")) {
      const pathname = new URL(response.url()).pathname;
      apiEvents.push(`RES ${response.status()} ${pathname}`);
    }
  });

  try {
    await page.goto(`${BASE_URL}/investigations`, { waitUntil: "networkidle" });
    if (!page.url().includes("/login")) {
      throw new Error(`Expected auth redirect to /login, got ${page.url()}`);
    }
    console.log("PASS: unauthenticated redirect");

    await expectVisible(page.getByRole("tab", { name: "注册" }), "registration tab visible");
    await page.getByRole("tab", { name: "注册" }).click();

    await expectVisible(page.getByText("需要邀请码"), "invite-required note visible");
    await page.getByLabel("用户名").fill(username);
    await page.getByRole("textbox", { name: "密码", exact: true }).fill(password);
    await page.getByLabel("确认密码").fill(password);

    const submitButton = page.getByRole("button", { name: "创建账号" });
    if (await submitButton.isEnabled()) {
      throw new Error("Expected register button to stay disabled without invite code");
    }
    console.log("PASS: missing invite blocks submit");

    await page.getByLabel("邀请码").fill("WRONG-CODE");
    await submitButton.click();
    await expectVisible(page.getByText("邀请码无效"), "invalid invite shows inline error");

    await page.getByLabel("邀请码").fill(INVITE_CODE);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 }),
      submitButton.click(),
    ]);

    await expectVisible(
      page.getByRole("heading", { name: "把客户投诉或异常情况贴进来" }),
      "self-register lands on homepage"
    );

    const homepageSubmit = page.getByRole("button", { name: "开始分析" });
    if (await homepageSubmit.isEnabled()) {
      throw new Error("Expected empty homepage composer submit to be disabled");
    }
    console.log("PASS: homepage empty submit disabled");

    const evidenceText = [
      "客户投诉：MCU-900 批次 C21 上电后 3 台板卡冒烟。",
      "现场动作：已停线，库存 186 台待隔离。",
      "测试补充：常温上电 2 秒内可复现，失效位在输入端电容附近。",
    ].join("\n\n");

    await page.getByLabel("首页异常输入框").fill(evidenceText);
    try {
      const createResponsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/cases" &&
          response.request().method() === "POST",
        { timeout: 30_000 }
      );
      const evidenceResponsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.includes("/evidence") &&
          response.request().method() === "POST",
        { timeout: 30_000 }
      );

      await homepageSubmit.click();

      const createResponse = await createResponsePromise;
      console.log(`HOME_CREATE_STATUS: ${createResponse.status()}`);

      const evidenceResponse = await evidenceResponsePromise;
      console.log(`HOME_EVIDENCE_STATUS: ${evidenceResponse.status()}`);

      await page.waitForURL((url) => url.pathname.startsWith("/investigations/"), { timeout: 30_000 });
    } catch (error) {
      console.error(`HOME_SUBMIT_TIMEOUT: currentUrl=${page.url()}`);
      console.error(`HOME_SUBMIT_API_EVENTS:\n${apiEvents.join("\n")}`);
      console.error(`HOME_SUBMIT_BODY:\n${await page.locator("body").innerText()}`);
      throw error;
    }

    await expectVisible(page.getByTestId("conversation-feed"), "conversation feed visible");
    await expectVisible(page.getByTestId("insight-column"), "insight column visible");

    const logoutButton = page.getByRole("button", { name: new RegExp(`退出 ${username}`) });
    await expectVisible(logoutButton, "logout button shows username");
    await logoutButton.click();
    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 30_000 });
    console.log("PASS: logout returns to login");

    await page.getByLabel("用户名").fill(username);
    await page.getByLabel("密码").fill(password);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 }),
      page.getByRole("button", { name: "登录" }).click(),
    ]);
    await expectVisible(
      page.getByRole("heading", { name: "把客户投诉或异常情况贴进来" }),
      "fresh login returns to homepage"
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          username,
          finalUrl: page.url(),
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
}

await main();
