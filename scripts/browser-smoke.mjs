import { chromium } from "@playwright/test";

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3001";
const AUTH_USERNAME = process.env.SMOKE_AUTH_USERNAME || process.env.SMOKE_AUTH_EMAIL || "";
const AUTH_PASSWORD = process.env.SMOKE_AUTH_PASSWORD || "";
const EVIDENCE_TEXT = "客户现场发现 3 片上电冒烟，批次 B12，已暂停出货并隔离库存。";

async function waitForEnabledButton(page, name, timeout = 30_000) {
  await page.waitForFunction(
    ({ buttonName }) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const target = buttons.find((button) => button.textContent?.includes(buttonName));
      return target instanceof HTMLButtonElement && !target.disabled;
    },
    { buttonName: name },
    { timeout }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];
  const staticResponses = [];
  let currentStep = "boot";

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();

    if (url.includes("/_next/static/")) {
      staticResponses.push({ url, status });
    }

    if (status >= 400) {
      failedResponses.push(`${status} ${url}`);
    }
  });

  page.setDefaultTimeout(30_000);

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    if (page.url().includes("/login")) {
      if (!AUTH_USERNAME || !AUTH_PASSWORD) {
        throw new Error("Auth is enabled but SMOKE_AUTH_USERNAME/SMOKE_AUTH_PASSWORD are not set.");
      }

      await page.getByLabel("用户名").fill(AUTH_USERNAME);
      await page.getByLabel("密码").fill(AUTH_PASSWORD);
      await page.getByRole("button", { name: "登录" }).click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
      await page.waitForLoadState("networkidle");

      if (page.url().includes("/login")) {
        throw new Error(`Login did not leave /login. Body: ${await page.locator("body").innerText()}`);
      }
    }

    const smokeTitle = `browser-smoke-${Date.now()}`;

    currentStep = "overview_loaded";
    console.log("STEP: overview_loaded");
    await page.getByRole("heading", { name: "把客户投诉或异常情况贴进来" }).waitFor({ timeout: 30_000 });
    await page.getByLabel("首页异常输入框").waitFor({ timeout: 30_000 });
    await page.getByLabel("首页异常输入框").fill(EVIDENCE_TEXT);
    await waitForEnabledButton(page, "开始分析");
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith("/investigations/"), { timeout: 30_000 }),
      page.getByRole("button", { name: "开始分析" }).click(),
    ]);

    currentStep = "investigation_loaded";
    console.log("STEP: investigation_created");
    await page.getByLabel("调查上下文").waitFor({ timeout: 30_000 });
    await page.getByText(/当前调查 #/).waitFor({ timeout: 30_000 });
    await page.getByText("调查对话").waitFor({ timeout: 30_000 });
    await page.getByTestId("conversation-feed").waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => {
      const feed = document.querySelector('[data-testid="conversation-feed"]');
      const messages = feed?.querySelectorAll(".message-card");
      return Boolean(messages && messages.length >= 2);
    }, { timeout: 30_000 });
    console.log("STEP: first_evidence_sent");

    if (!staticResponses.some((item) => item.status === 200)) {
      throw new Error("No successful _next/static response captured");
    }

    if (failedResponses.length) {
      throw new Error(`Failed responses: ${failedResponses.join(" | ")}`);
    }

    if (consoleErrors.length) {
      throw new Error(`Console errors: ${consoleErrors.join(" | ")}`);
    }

    if (pageErrors.length) {
      throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
    }

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          smokeTitle,
          finalUrl: page.url(),
          staticResponseCount: staticResponses.length,
          failedResponseCount: failedResponses.length,
          consoleErrorCount: consoleErrors.length,
          pageErrorCount: pageErrors.length,
        },
        null,
        2
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`STEP=${currentStep} :: ${message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
