import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const htmlPath = new URL("./index.html", import.meta.url);

function readHtml() {
  return fs.readFileSync(htmlPath, "utf8");
}

function readScript() {
  const html = readHtml();
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  assert.ok(match, "index.html should include an inline app script");
  return match[1];
}

class FakeElement {
  constructor(id = "", tagName = "div") {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this._className = "";
    this._innerHTML = "";
    this._textContent = "";
    this.value = "";
    this.files = [];
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.classList = {
      toggle: (name, force) => {
        const classes = new Set(this._className.split(/\s+/).filter(Boolean));
        const shouldAdd = typeof force === "boolean" ? force : !classes.has(name);
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
        this._className = Array.from(classes).join(" ");
      },
      contains: (name) => new Set(this._className.split(/\s+/).filter(Boolean)).has(name),
    };
  }

  set className(value) {
    this._className = value;
  }

  get className() {
    return this._className;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (value === "") this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return this._textContent;
  }

  appendChild(child) {
    this.children.push(child);
    this.scrollHeight += 1;
    return child;
  }

  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }
}

function createHarness({
  fetchImpl = async () => { throw new Error("offline"); },
  promptImpl = () => null,
  confirmImpl = () => true,
  storageSeed = null,
  location = { protocol: "http:", hostname: "localhost", port: "3008", origin: "http://localhost:3008" },
} = {}) {
  const ids = [
    "workspace-shell",
    "project-list",
    "project-count",
    "new-project-button",
    "sidebar-toggle",
    "workspace-title",
    "workspace-subtitle",
    "connection-badge",
    "generation-meta-badge",
    "chat-thread",
    "known-facts-list",
    "missing-fields-list",
    "next-question-copy",
    "guided-thinking-copy",
    "guided-thinking-list",
    "current-stage-pill",
    "current-stage-copy",
    "next-stage-copy",
    "progress-status-copy",
    "composer-form",
    "composer-input",
    "image-input",
    "upload-strip",
    "preview-toggle",
    "stage-manager-toggle",
    "advance-button",
    "draft-status",
    "preview-drawer",
    "close-preview",
    "preview-stage-note",
    "preview-generation-meta",
    "preview-report-status",
    "export-word-button",
    "export-pdf-button",
    "open-report-link",
    "stage-manager-drawer",
    "close-stage-manager",
    "stage-manager-note",
    "stage-manager-list",
  ];

  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  const document = {
    getElementById(id) {
      return elements[id] || null;
    },
    createElement(tagName) {
      return new FakeElement("", tagName);
    },
  };

  const store = new Map(storageSeed ? Object.entries(storageSeed) : []);
  const localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };

  class FileReader {
    readAsDataURL(file) {
      this.result = `data:image/mock;base64,${file.name}`;
      if (this.onload) this.onload();
    }
  }

  return { document, elements, localStorage, fetchImpl, FileReader, location, promptImpl, confirmImpl };
}

async function bootstrapApp(options = {}) {
  const harness = createHarness(options);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const appFactory = new AsyncFunction(
    "document",
    "localStorage",
    "fetch",
    "FileReader",
    "location",
    "prompt",
    "confirm",
    `${readScript()}; return { state, els, getCurrentProject, handleSend, handleAdvance, handleFileSelect, togglePreview, toggleStageManager, handleStageAction, renameProject, deleteProject, createProject };`
  );
  const app = await appFactory(
    harness.document,
    harness.localStorage,
    harness.fetchImpl,
    harness.FileReader,
    harness.location,
    harness.promptImpl,
    harness.confirmImpl
  );
  return { ...harness, app };
}

test("frontend exists as a single self-contained HTML file", () => {
  assert.equal(fs.existsSync(htmlPath), true, "index.html should exist");
});

test("frontend exposes the core 8D workspace layout", () => {
  const html = readHtml();
  assert.match(html, /id="project-sidebar"/);
  assert.match(html, /id="sidebar-toggle"/);
  assert.match(html, /Pin2pin Fireline/);
  assert.match(html, /Pin2pin\.ai 旗下的异常响应与失效分析工作台/);
  assert.match(html, /assets\/xkyx-tech-grid\.svg/);
  assert.match(html, /id="project-list"/);
  assert.match(html, /id="chat-thread"/);
  assert.match(html, /id="composer-form"/);
  assert.match(html, /发生地点与对象/);
  assert.match(html, /影响数量与范围/);
  assert.match(html, /grid-template-areas:\s*"header"\s*"composer"\s*"content"/);
  assert.match(html, /align-content:\s*start/);
});

test("frontend includes image upload and 8D preview controls", () => {
  const html = readHtml();
  assert.match(html, /type="file"/);
  assert.match(html, /accept="image\/\*,\.doc,\.docx,application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document,application\/msword,application\/pdf,\.pdf"/);
  assert.match(html, /上传文件/);
  assert.match(html, /8D预览/);
  assert.match(html, /阶段管理/);
  assert.match(html, /导出 Word/);
  assert.match(html, /导出 PDF/);
});

test("frontend includes stage manager drawer controls", () => {
  const html = readHtml();
  assert.match(html, /id="stage-manager-toggle"/);
  assert.match(html, /id="stage-manager-drawer"/);
  assert.match(html, /id="stage-manager-list"/);
  assert.match(html, /解锁修改/);
  assert.match(html, /重新复审/);
});

test("frontend persists projects locally and supports project switching", () => {
  const html = readHtml();
  assert.match(html, /localStorage/);
  assert.match(html, /project-list/);
  assert.match(html, /currentProjectId/);
});

test("frontend integrates with the backend case and workflow endpoints", () => {
  const html = readHtml();
  assert.match(html, /\/cases/);
  assert.match(html, /\/evidence/);
  assert.match(html, /\/stages\//);
  assert.match(html, /\/draft-preview/);
  assert.match(html, /fetch\(/);
});

test("frontend renders structured result panels for reasoning mode", () => {
  const html = readHtml();
  for (const text of [
    "当前已知事实",
    "还缺哪些信息",
    "下一步建议",
    "思考引导",
    "输出预览",
    "当前阶段",
    "下一阶段",
    "推进状态",
  ]) {
    assert.match(html, new RegExp(text), `missing workspace text: ${text}`);
  }
});

test("frontend includes generation metadata display areas", () => {
  const html = readHtml();
  assert.match(html, /id="generation-meta-badge"/);
  assert.match(html, /id="preview-generation-meta"/);
  assert.match(html, /id="open-report-link"/);
  assert.match(html, /生成信息/);
});

test("frontend boots with a default local project", async () => {
  const { app, elements } = await bootstrapApp();
  assert.equal(app.state.projects.length, 1);
  assert.ok(app.state.currentProjectId);
  assert.equal(elements["project-count"].textContent, "1");
  assert.match(elements["workspace-title"].textContent, /默认分析项目|新建失效分析项目/);
  assert.match(elements["current-stage-copy"].textContent, /D2/);
  assert.match(elements["next-stage-copy"].textContent, /D3/);
  assert.match(elements["connection-badge"].textContent, /本地 fallback mockup/);
  assert.match(elements["workspace-shell"].className, /sidebar-expanded/);
});

test("frontend allows collapsing the sidebar without breaking the main workspace", async () => {
  const { app, elements } = await bootstrapApp();
  elements["sidebar-toggle"].listeners.click[0]();
  assert.match(elements["workspace-shell"].className, /sidebar-collapsed/);
  assert.match(elements["current-stage-copy"].textContent, /D2/);
  assert.match(readHtml(), /width:\s*48px/);
});

test("frontend supports renaming projects", async () => {
  const { app } = await bootstrapApp({ promptImpl: () => "重新命名项目" });
  const projectId = app.getCurrentProject().id;
  app.renameProject(projectId);
  assert.equal(app.getCurrentProject().title, "重新命名项目");
});

test("frontend supports deleting the current project and falls back to another one", async () => {
  const { app } = await bootstrapApp({ confirmImpl: () => true });
  const firstId = app.getCurrentProject().id;
  app.createProject({ title: "第二项目" }, true);
  const secondId = app.getCurrentProject().id;
  assert.notEqual(firstId, secondId);
  app.deleteProject(secondId);
  assert.equal(app.getCurrentProject().id, firstId);
  assert.equal(app.state.projects.length, 1);
});

test("frontend uses pure local mockup flow and generates the final 8D draft after D8 confirmation", async () => {
  const { app, elements } = await bootstrapApp();
  app.els.composerInput.value =
    "Customer reports intermittent failure on batch B12 discovered on March 1, impacting 120 units.";

  await app.handleSend({ preventDefault() {} });

  let project = app.getCurrentProject();
  assert.equal(project.stage, "D2");
  assert.equal(project.messages.length, 2);
  assert.equal(project.draftMarkdown, "");
  assert.equal(elements["connection-badge"].textContent, "后端已断开，使用本地 fallback mockup");
  assert.match(project.messages[1].content, /当前阶段：D2/);
  assert.match(project.messages[1].content, /D2: 问题描述/);
  assert.equal(elements["generation-meta-badge"].textContent, "当前模式：离线 Mockup 演示");

  await app.handleAdvance();
  await app.handleAdvance();
  app.els.composerInput.value = "继续分析";
  await app.handleSend({ preventDefault() {} });
  await app.handleAdvance();
  await app.handleAdvance();
  await app.handleAdvance();
  await app.handleAdvance();

  project = app.getCurrentProject();
  assert.equal(project.stage, "D8");
  assert.match(project.draftMarkdown, /## D1/);
  assert.match(project.draftMarkdown, /方暨兰，温阿利，耿向宇，崔杰，张涛，吴蕙羽/);
  assert.match(project.draftMarkdown, /## D8/);
  assert.equal(elements["generation-meta-badge"].textContent, "当前模式：离线 Mockup 演示");
  assert.match(elements["draft-status"].textContent, /已有正式结果/);
  assert.match(project.messages.at(-1).content, /已生成正式结果/);
  assert.doesNotMatch(project.messages.at(-1).content, /思考引导：/);
});

test("frontend local mockup shows stage guidance instead of missing-field prompts", async () => {
  const { app, elements } = await bootstrapApp();
  app.els.composerInput.value = "客户反馈批次B12在2026-03-01发现黑屏异常，影响120台。";

  await app.handleSend({ preventDefault() {} });

  assert.match(elements["next-question-copy"].textContent, /D2 问题描述结论/);
  assert.match(elements["progress-status-copy"].textContent, /离线 mockup 阶段内容/);
  assert.match(elements["progress-status-copy"].textContent, /D1/);
});

test("frontend local mockup stays on D2 until explicit confirmation", async () => {
  const { app, elements } = await bootstrapApp();

  app.els.composerInput.value = "客户反馈黑屏异常。";
  await app.handleSend({ preventDefault() {} });
  assert.match(app.getCurrentProject().messages[1].content, /当前阶段：D2/);
  assert.equal(app.getCurrentProject().messages[1].messageType, "fact_summary_card");
  assert.doesNotMatch(app.getCurrentProject().messages[1].content, /思考引导：/);
  assert.match(elements["next-question-copy"].textContent, /D2 问题描述结论/);

  app.els.composerInput.value = "批次B12";
  await app.handleSend({ preventDefault() {} });
  assert.equal(app.getCurrentProject().stage, "D2");
  assert.match(elements["next-question-copy"].textContent, /D2 问题描述结论/);

  app.els.composerInput.value = "2026-03-01发现";
  await app.handleSend({ preventDefault() {} });
  assert.equal(app.getCurrentProject().stage, "D2");
  assert.match(elements["next-question-copy"].textContent, /D2 问题描述结论/);
});

test("frontend local mockup ignores batch variants and still requires explicit confirm to advance", async () => {
  const { app, elements } = await bootstrapApp();

  app.els.composerInput.value = "客户反馈黑屏异常。";
  await app.handleSend({ preventDefault() {} });
  assert.equal(app.getCurrentProject().stage, "D2");

  app.els.composerInput.value = "批次号111";
  await app.handleSend({ preventDefault() {} });
  assert.equal(app.getCurrentProject().stage, "D2");
  assert.match(elements["next-question-copy"].textContent, /D2 问题描述结论/);
});

test("frontend supports image uploads and preview drawer toggling", async () => {
  const { app, elements } = await bootstrapApp();
  await app.handleFileSelect({ target: { files: [{ name: "issue-photo.png" }] } });

  assert.equal(app.state.pendingAttachments.length, 1);
  assert.equal(elements["upload-strip"].children.length, 1);

  app.togglePreview(true);
  assert.equal(elements["preview-drawer"].classList.contains("open"), true);
  assert.equal(elements["preview-drawer"].getAttribute("aria-hidden"), "false");
});

test("frontend keeps D4 in dialog and offers in-message closure choices before D5", async () => {
  const { app } = await bootstrapApp();
  await app.handleSend({ preventDefault() {} });
  await app.handleAdvance();
  await app.handleAdvance();

  const project = app.getCurrentProject();
  const latestAssistant = project.messages.at(-1);

  assert.equal(project.stage, "D4");
  assert.equal(latestAssistant.messageType, "decision_prompt");
  assert.ok(Array.isArray(latestAssistant.actions));
  assert.deepEqual(
    latestAssistant.actions.map((item) => item.label),
    ["继续分析", "按 D4 收口", "生成分析摘要", "生成 8D"]
  );
});

test("frontend supports natural-language D4 closure and defaults to analysis summary output", async () => {
  const { app } = await bootstrapApp();
  await app.handleSend({ preventDefault() {} });
  await app.handleAdvance();
  await app.handleAdvance();

  app.els.composerInput.value = "先按 D4 收口";
  await app.handleSend({ preventDefault() {} });

  const project = app.getCurrentProject();
  const latestAssistant = project.messages.at(-1);

  assert.equal(project.stage, "D4");
  assert.equal(project.closureMode, "d4_final");
  assert.equal(project.outputKind, "analysis_summary");
  assert.match(project.draftMarkdown, /# 分析摘要/);
  assert.equal(latestAssistant.messageType, "output_card");
  assert.match(latestAssistant.content, /已按 D4 收口/);
});

test("frontend ingests docx and pdf text into the dialogue context", async () => {
  const { app } = await bootstrapApp();
  await app.handleFileSelect({
    target: {
      files: [
        { name: "failure-analysis.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extractedText: "客户反馈 C25 炸裂，批次B12，影响120台。" },
        { name: "customer-mail.pdf", type: "application/pdf", extractedText: "客户邮件说明：首次上电冒烟，发现于2026-03-21。" },
      ],
    },
  });

  await app.handleSend({ preventDefault() {} });

  const project = app.getCurrentProject();
  const latestAssistant = project.messages.at(-1);
  const userMessage = project.messages[0];

  assert.equal(userMessage.attachments.length, 2);
  assert.equal(userMessage.attachments[0].kind, "docx");
  assert.equal(userMessage.attachments[1].kind, "pdf");
  assert.match(latestAssistant.content, /批次B12/);
  assert.match(latestAssistant.content, /2026-03-21/);
});

test("frontend local stage manager supports unlock and revalidate actions", async () => {
  const { app, elements } = await bootstrapApp();
  await app.handleSend({ preventDefault() {} });
  await app.handleAdvance();
  await app.handleAdvance();

  let project = app.getCurrentProject();
  assert.equal(project.stage, "D4");
  assert.equal(Boolean(project.localConfirmedStages.D2), true);
  assert.equal(Boolean(project.localConfirmedStages.D3), true);

  await app.handleStageAction("D2", "unlock");
  project = app.getCurrentProject();
  assert.equal(project.stage, "D2");
  assert.equal(Boolean(project.localConfirmedStages.D2), false);
  assert.equal(Boolean(project.localImpactedStages.D3), true);

  app.toggleStageManager(true);
  assert.equal(elements["stage-manager-drawer"].classList.contains("open"), true);
  assert.match(elements["stage-manager-note"].textContent, /需复审/);

  await app.handleStageAction("D3", "revalidate");
  project = app.getCurrentProject();
  assert.equal(project.stage, "D3");
  assert.equal(Boolean(project.localImpactedStages.D3), false);
  assert.match(project.messages.at(-1).content, /D3/);
});

test("frontend does not call backend even if fetch is available", async () => {
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    throw new Error(`fetch should not be called: ${url}`);
  };

  const { app, elements } = await bootstrapApp({
    fetchImpl,
    location: { protocol: "https:", hostname: "demo.example.com", port: "", origin: "https://demo.example.com" },
  });
  app.els.composerInput.value = "Voltage drop on batch B18.";

  await app.handleSend({ preventDefault() {} });

  assert.equal(fetchCalls.length, 0);
  assert.equal(app.getCurrentProject().backendCaseId, null);
  assert.equal(app.getCurrentProject().stage, "D2");
  assert.equal(elements["connection-badge"].textContent, "后端已断开，使用本地 fallback mockup");
  assert.match(elements["current-stage-copy"].textContent, /D2/);
  assert.match(elements["next-stage-copy"].textContent, /D3/);
  assert.match(elements["current-stage-pill"].textContent, /D2/);
  assert.match(elements["next-question-copy"].textContent, /D2 问题描述结论/);
  assert.equal(elements["generation-meta-badge"].textContent, "当前模式：离线 Mockup 演示");
});

test("frontend supports local stage-driven flow with confirm advancement", async () => {
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    throw new Error(`fetch should not be called: ${url}`);
  };

  const { app } = await bootstrapApp({
    fetchImpl,
    location: { protocol: "https:", hostname: "demo.example.com", port: "", origin: "https://demo.example.com" },
  });

  app.els.composerInput.value = "客户反馈黑屏，批次B12";
  await app.handleSend({ preventDefault() {} });
  assert.match(app.getCurrentProject().messages.at(-1).content, /当前阶段：D2/);

  await app.handleAdvance();
  assert.match(app.getCurrentProject().messages.at(-1).content, /当前阶段：D3/);
  assert.equal(fetchCalls.length, 0);
  assert.equal(app.getCurrentProject().localConfirmedStages.D2.includes("D2: 问题描述"), true);
});

test("frontend keeps localhost static server mode fully local", async () => {
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    throw new Error(`fetch should not be called: ${url}`);
  };

  const { app } = await bootstrapApp({ fetchImpl });
  app.els.composerInput.value = "本地联调";
  await app.handleSend({ preventDefault() {} });

  assert.equal(fetchCalls.length, 0);
  assert.equal(app.getCurrentProject().backendCaseId, null);
});

test("frontend advances locally when user clicks the advance button", async () => {
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    throw new Error(`fetch should not be called: ${url}`);
  };

  const { app, elements } = await bootstrapApp({ fetchImpl });
  await app.handleAdvance();

  assert.equal(fetchCalls.length, 0);
  assert.match(elements["progress-status-copy"].textContent, /已推进到下一阶段/);
  assert.match(elements["current-stage-copy"].textContent, /D3/);
});

test("frontend recognizes advance commands and advances locally", async () => {
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    throw new Error(`fetch should not be called: ${url}`);
  };

  const { app } = await bootstrapApp({ fetchImpl });
  app.els.composerInput.value = "进入下一步";
  await app.handleSend({ preventDefault() {} });

  assert.equal(fetchCalls.length, 0);
  assert.match(app.getCurrentProject().messages.at(-1).content, /当前阶段：D3/);
});

test("frontend advances to D4, then requires an explicit continue decision before entering D5", async () => {
  const { app, elements } = await bootstrapApp();
  await app.handleAdvance();
  assert.match(elements["current-stage-copy"].textContent, /D3/);
  await app.handleAdvance();
  assert.match(elements["current-stage-copy"].textContent, /D4/);
  app.els.composerInput.value = "继续分析";
  await app.handleSend({ preventDefault() {} });
  assert.match(elements["current-stage-copy"].textContent, /D5/);
  await app.handleAdvance();
  assert.match(elements["current-stage-copy"].textContent, /D6/);
});

test("frontend shows draft generation metadata in the preview drawer", async () => {
  const { app, elements } = await bootstrapApp();
  await app.handleSend({ preventDefault() {} });
  await app.handleAdvance();
  await app.handleAdvance();
  app.els.composerInput.value = "继续分析";
  await app.handleSend({ preventDefault() {} });
  await app.handleAdvance();
  await app.handleAdvance();
  await app.handleAdvance();
  await app.handleAdvance();
  app.togglePreview(true);

  assert.equal(elements["preview-generation-meta"].textContent, "当前模式：离线 Mockup 演示");
  assert.match(elements["preview-stage-note"].textContent, /D8/);
  assert.match(elements["preview-report-status"].textContent, /正式结果已生成/);
  assert.equal(elements["open-report-link"].getAttribute("aria-disabled"), "false");
  assert.match(elements["open-report-link"].getAttribute("href"), /^(blob:|data:text\/html)/);
  assert.equal(elements["export-word-button"].disabled, false);
  assert.equal(elements["export-pdf-button"].disabled, false);
  assert.match(elements["open-report-link"].getAttribute("data-report-outline"), /D1 团队成员/);
  assert.match(elements["open-report-link"].getAttribute("data-report-outline"), /D2 问题描述/);
  assert.match(elements["open-report-link"].getAttribute("data-report-outline"), /Describe the Problem/);
});

test("frontend stops advancing after final D8 report is generated", async () => {
  const { app, elements } = await bootstrapApp();
  await app.handleSend({ preventDefault() {} });
  await app.handleAdvance();
  await app.handleAdvance();
  app.els.composerInput.value = "继续分析";
  await app.handleSend({ preventDefault() {} });
  await app.handleAdvance();
  await app.handleAdvance();
  await app.handleAdvance();
  await app.handleAdvance();

  const beforeCount = app.getCurrentProject().messages.length;
  await app.handleAdvance();

  assert.equal(app.getCurrentProject().stage, "D8");
  assert.equal(app.getCurrentProject().messages.length, beforeCount);
  assert.equal(elements["advance-button"].disabled, true);
  assert.match(elements["advance-button"].textContent, /已收口/);
  assert.match(elements["next-stage-copy"].textContent, /已完成/);
});

test("frontend normalizes multiline input before storing and rendering", async () => {
  const { app } = await bootstrapApp();
  app.els.composerInput.value = "客户反馈黑屏异常。\n\n\n批次B12\n\n影响120台。";

  await app.handleSend({ preventDefault() {} });

  const project = app.getCurrentProject();
  assert.equal(project.messages[0].content.includes("\n\n"), false);
});
