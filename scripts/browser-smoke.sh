#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:3001}"
SESSION="bs-$$"
SMOKE_AUTH_EMAIL="${SMOKE_AUTH_EMAIL:-}"
SMOKE_AUTH_PASSWORD="${SMOKE_AUTH_PASSWORD:-}"
EVIDENCE_TEXT="客户现场发现 3 片上电冒烟，批次 B12，已暂停出货并隔离库存。"
CORRECTION_TEXT="等下，刚补到的新信息是并非全部冒烟，而是低温条件下偶发，这会影响前面的判断。"
SUMMARY_TEXT="帮我总结一下现在情况"
ACTION_PLAN_TEXT="发生原因侧永久措施已经确定为切回正确贴装角度并锁定程序，流出原因侧补 AOI 阈值回调和出货前加严检查。"
CASE_CONFIRM_TEXT="客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及机种 MCU-900 与批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。"

cleanup() {
  playwright-cli -s="$SESSION" close >/dev/null 2>&1 || true
}

trap cleanup EXIT

if ! command -v playwright-cli >/dev/null 2>&1; then
  echo "playwright-cli is required for browser smoke." >&2
  exit 1
fi

if ! curl -fsS "$BASE_URL/api/health" >/dev/null; then
  echo "Browser smoke requires a running app at $BASE_URL" >&2
  echo "Start it first with npm start, or point SMOKE_BASE_URL at a live preview." >&2
  exit 1
fi

read -r -d '' SMOKE_CODE <<'EOF' || true
async (page) => {
  const baseUrl = "__BASE_URL__";
  const evidenceText = "__EVIDENCE_TEXT__";
  const correctionText = "__CORRECTION_TEXT__";
  const summaryText = "__SUMMARY_TEXT__";
  const actionPlanText = "__ACTION_PLAN_TEXT__";
  const caseConfirmText = "__CASE_CONFIRM_TEXT__";
  const authEmail = "__SMOKE_AUTH_EMAIL__";
  const authPassword = "__SMOKE_AUTH_PASSWORD__";
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];
  const staticResponses = [];

  async function fillComposerAndWait(text) {
    const composer = page.getByLabel("证据输入框");
    await composer.waitFor({ timeout: 30000 });
    await composer.fill(text);
    await page.waitForFunction(
      ({ value }) => {
        const el = document.querySelector('textarea[aria-label="证据输入框"]');
        return el instanceof HTMLTextAreaElement && el.value === value;
      },
      { value: text },
      { timeout: 30000 }
    );
  }

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  page.on("pageerror", (err) => {
    pageErrors.push(String(err));
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();

    if (url.includes("/_next/static/")) {
      staticResponses.push({ url, status });
    }

    if (status >= 400) {
      failedResponses.push(String(status) + " " + url);
    }
  });

  page.setDefaultTimeout(30000);
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  if (page.url().includes("/login")) {
    if (!authEmail || !authPassword) {
      throw new Error("Auth is enabled but SMOKE_AUTH_EMAIL/SMOKE_AUTH_PASSWORD are not set.");
    }
    await page.getByLabel("邮箱").fill(authEmail);
    await page.getByLabel("密码").fill(authPassword);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      throw new Error("Login did not leave /login. Body: " + (await page.locator("body").innerText()));
    }
  }

  const smokeTitle = "browser-smoke-" + Date.now();
  await page.getByRole("heading", { name: "把现场碎片，推进成可交付调查" }).waitFor({ timeout: 30000 });
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/investigations/"), { timeout: 30000 }),
    page.getByRole("button", { name: "开始新调查" }).click(),
  ]);

  await page.getByText("AI 协作区").waitFor({ timeout: 30000 });
  await page.getByLabel("证据输入框").waitFor({ timeout: 30000 });
  await page.getByText(/当前调查 #/).waitFor({ timeout: 30000 });

  await fillComposerAndWait(evidenceText);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30000 }
    ),
    page.getByRole("button", { name: "发送证据" }).click(),
  ]);
  await page.getByText("我先帮你接下这个案件").waitFor({ timeout: 30000 });

  await fillComposerAndWait(correctionText);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30000 }
    ),
    page.getByRole("button", { name: "发送证据" }).click(),
  ]);

  await page.getByText("正在回看前序判断").waitFor({ timeout: 30000 });

  await fillComposerAndWait(summaryText);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30000 }
    ),
    page.getByRole("button", { name: "发送证据" }).click(),
  ]);

  await page.getByText("当前情况总结").first().waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "整理分析结论" }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "整理分析结论" }).click();
  await page.getByLabel("报告预览抽屉").waitFor({ timeout: 30000 });
  await page.getByTitle("分析结论预览").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "关闭预览" }).click();
  await page.getByLabel("报告预览抽屉").waitFor({ state: "hidden", timeout: 30000 });

  const caseRailButton = page.getByRole("button", { name: "调查" });
  if (await caseRailButton.isVisible().catch(() => false)) {
    await caseRailButton.click();
  } else {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("fireline:toggle-case-drawer"));
    });
  }
  await page.getByLabel("调查列表抽屉").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "新建调查" }).click();
  await page.getByLabel("调查标题").fill("钽电容反向贴装客诉案例");
  await page.getByLabel("种子案例").selectOption({ label: "钽电容反向贴装客诉案例" });
  await page.getByRole("button", { name: "创建调查" }).click();
  await page.getByRole("heading", { name: "钽电容反向贴装客诉案例" }).waitFor({ timeout: 30000 });
  await page.getByText("AI 协作区").waitFor({ timeout: 30000 });

  await fillComposerAndWait(actionPlanText);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30000 }
    ),
    page.getByRole("button", { name: "发送证据" }).click(),
  ]);

  await page.getByRole("button", { name: "整理行动方案" }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "整理行动方案" }).click();
  await page.getByLabel("报告预览抽屉").waitFor({ timeout: 30000 });
  await page.getByText("类型：action_plan").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "关闭预览" }).click();
  await page.getByLabel("报告预览抽屉").waitFor({ state: "hidden", timeout: 30000 });

  await fillComposerAndWait(caseConfirmText);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30000 }
    ),
    page.getByRole("button", { name: "发送证据" }).click(),
  ]);

  await page.getByTestId("new-case-confirmation-card").waitFor({ timeout: 30000 });
  await page.getByText("我判断这更像另一条新调查").first().waitFor({ timeout: 30000 });
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/evidence") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30000 }
    ),
    page.getByRole("button", { name: "继续当前调查" }).click(),
  ]);

  if (!staticResponses.some((item) => item.status === 200)) {
    throw new Error("No successful _next/static response captured");
  }

  if (failedResponses.length) {
    throw new Error("Failed responses: " + failedResponses.join(" | "));
  }

  if (consoleErrors.length) {
    throw new Error("Console errors: " + consoleErrors.join(" | "));
  }

  if (pageErrors.length) {
    throw new Error("Page errors: " + pageErrors.join(" | "));
  }

  return {
    baseUrl,
    smokeTitle,
    staticResponseCount: staticResponses.length,
    failedResponseCount: failedResponses.length,
    consoleErrorCount: consoleErrors.length,
    pageErrorCount: pageErrors.length,
  };
}
EOF

SMOKE_CODE=${SMOKE_CODE//__BASE_URL__/$BASE_URL}
SMOKE_CODE=${SMOKE_CODE//__EVIDENCE_TEXT__/$EVIDENCE_TEXT}
SMOKE_CODE=${SMOKE_CODE//__CORRECTION_TEXT__/$CORRECTION_TEXT}
SMOKE_CODE=${SMOKE_CODE//__SUMMARY_TEXT__/$SUMMARY_TEXT}
SMOKE_CODE=${SMOKE_CODE//__ACTION_PLAN_TEXT__/$ACTION_PLAN_TEXT}
SMOKE_CODE=${SMOKE_CODE//__CASE_CONFIRM_TEXT__/$CASE_CONFIRM_TEXT}
SMOKE_CODE=${SMOKE_CODE//__SMOKE_AUTH_EMAIL__/$SMOKE_AUTH_EMAIL}
SMOKE_CODE=${SMOKE_CODE//__SMOKE_AUTH_PASSWORD__/$SMOKE_AUTH_PASSWORD}

playwright-cli -s="$SESSION" open about:blank >/dev/null
SMOKE_OUTPUT="$(playwright-cli -s="$SESSION" run-code "$SMOKE_CODE" 2>&1)"
printf '%s\n' "$SMOKE_OUTPUT"

if printf '%s\n' "$SMOKE_OUTPUT" | rg -q '^### Error$|^Error: |^TimeoutError:'; then
  echo "Browser smoke failed." >&2
  exit 1
fi
