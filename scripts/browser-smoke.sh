#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:3001}"
SESSION="bs-$$"
EVIDENCE_TEXT="客户现场发现 3 片上电冒烟，批次 B12，已暂停出货并隔离库存。"

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

SMOKE_CODE=$(cat <<EOF
async (page) => {
  const baseUrl = "${BASE_URL}";
  const evidenceText = "${EVIDENCE_TEXT}";
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];
  const staticResponses = [];

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

  const smokeTitle = "browser-smoke-" + Date.now();

  await page.getByRole("button", { name: "快速新建案件" }).click();
  await page.getByLabel("案件抽屉").waitFor({ timeout: 30000 });
  await page.getByRole("textbox", { name: "案件标题" }).fill(smokeTitle);
  await page.getByRole("button", { name: "创建案件" }).click();
  await page.getByRole("heading", { name: smokeTitle }).waitFor({ timeout: 30000 });

  await page.getByLabel("证据输入框").fill(evidenceText);

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

  await page.getByRole("button", { name: "整理分析结论" }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "整理分析结论" }).click();
  await page.getByLabel("报告预览抽屉").waitFor({ timeout: 30000 });
  await page.getByTitle("分析结论预览").waitFor({ timeout: 30000 });

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
)

playwright-cli -s="$SESSION" open about:blank >/dev/null
playwright-cli -s="$SESSION" run-code "$SMOKE_CODE"
