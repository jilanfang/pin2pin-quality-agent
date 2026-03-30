# Pin2pin Fireline 当前交接说明

> 目的：给新线程一个与当前代码一致的恢复点。当前权威实现是 `Next.js App Router + TypeScript` 主应用；本交接说明只记录当前主线状态，不再把已清理的 `index.html` 离线原型作为继续开发依据。

> 2026-03-24 补充：产品主定位已升级为 `失效分析 / 异常响应工具`，`8D` 是正式输出物之一，不再是唯一中心对象。

## 状态快照（2026-03-30）

当前应以 `app/`、`components/`、`lib/`、`tests/` 为恢复和继续开发的主线范围。

- 主应用：`Next.js App Router + TypeScript`
- 主要入口：`app/page.tsx`、`components/workspace.tsx`
- 核心域逻辑：`lib/domain/*`
- 服务端/API：`lib/server/*`、`app/api/**`
- 测试：`tests/*.test.ts*`

---

## 1. 当前验证状态

本轮在当前 Task 5 分支 / worktree 做了直接验证：

```bash
npm test
npm run typecheck
npm run build
```

结果：

- `npm run typecheck`：通过
- `npm run build`：通过
- `npm test`：未全绿；当前基线仍有 1 个已知无关失败
  - 失败文件：`tests/browser-smoke-script.test.ts`
  - 直接原因：脚本执行环境缺少 `rg`，报错为 `rg: command not found`

这意味着：

- 当前主线代码可以完成类型检查与生产构建
- 测试套件仍存在一个已知基线问题，不能把 `npm test` 结果写成全通过

---

## 2. 当前真实实现边界

### A. 主应用结构

文件：

- `app/page.tsx`
- `components/workspace.tsx`
- `lib/domain/*`
- `lib/server/*`
- `tests/*.test.ts*`

### B. 当前已实现能力

- 案件创建与列表
- 发送证据
- 以 `chatbox` 为唯一主输入 / 输出口的调查工作台
- 自动识别高优先级客诉并收口到 `24h 初版 8D / 快速响应版`
- 在主分析卡里区分：
  - `已知事实`
  - `待验证假设`
  - `来源：当前对话材料`
- 报告预览中提示：
  - `已确认事实需继续回看原材料，待验证项不能直接写成结论。`
- 阶段确认 / 解锁 / 复审
- `24h / interim / final` 报告阶段
- 文风选择
- 文本 / HTML 报告预览
- Final 结案
- 本地文件存储 / Postgres 存储
- LLM 适配层与 `extract / copilot / report` 分能力路由

### C. 当前 API

- `GET /api/health`
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/evidence`
- `POST /api/cases/:id/stages/:stage/confirm`
- `POST /api/cases/:id/stages/:stage/unlock`
- `POST /api/cases/:id/stages/:stage/revalidate`
- `GET /api/cases/:id/report-preview`
- `GET /api/cases/:id/report-html`
- `POST /api/cases/:id/report`

---

## 3. 当前判断原则

如果继续当前线程，默认原则应为：

1. `Next.js` 主应用是唯一权威实现
2. 新增产品能力默认落到 `app/ + components/ + lib/`
3. 交接、验证、评审都以当前主线实现为准，不再引用已清理的离线原型流程
4. 对外描述当前状态时，保留可审计的验证结果，不把已知基线失败写成通过

---

## 4. 当前建议的恢复点

继续本线程时优先看：

- `app/page.tsx`
- `components/workspace.tsx`
- `lib/domain/workflow-engine.ts`
- `lib/domain/report-builder.ts`
- `lib/server/api.ts`
- `tests/workspace.test.tsx`
- `docs/current-handoff.md`
