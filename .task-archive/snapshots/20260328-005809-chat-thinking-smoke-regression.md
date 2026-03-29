# Task Snapshot: 对话驱动 thinking 与真实浏览器回归

## Metadata
- Snapshot ID: 20260328-005809-chat-thinking-smoke-regression
- Saved At: 2026-03-28 00:58 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260328-005809-chat-thinking-smoke-regression.md

## Goal
把当前产品继续收口成“case 管理 + 对话框输入”的主交互，并补上 thinking、碎片输入跨阶段回看和真实浏览器回归护栏。

## Success Criteria
- `/api/cases/:id/evidence` 能返回多意图输入的 `conversationMeta`
- 前端对话区能显示轻量 thinking 状态，不暴露原始思维链
- `question / summary_request / correction` 都有测试覆盖
- 真实浏览器能跑通首单空白案件、发送证据、correction、summary、预览结果

## Scope
- 服务端输入分类与 `conversationMeta` 契约
- 前端最小 thinking 状态卡和消息流接入
- 浏览器 smoke 脚本更新到当前 UI
- 不做新的复杂面板或流程按钮台

## Current Phase
阶段性完成，已通过单测、类型检查和真实浏览器 smoke；下一步进入“继续收口消息/卡片决策和更多用户旅程回归”。

## Completed
- 为 `postEvidenceHandler` 补了多意图识别：
  - `evidence`
  - `question`
  - `summary_request`
  - `correction`
  - `decision_signal`
- 新增 `conversationMeta` / `ConversationThinkingState` 类型，并把它挂到 case workflow 响应
- 服务端能返回：
  - `primaryStage`
  - `relatedStages`
  - `impactedStages`
  - `thinking.mode`
  - `thinking.steps`
- 前端 `Workspace` 已接入：
  - pending thinking 状态
  - 服务端返回的 thinking 状态卡
  - correction 场景下的“正在回看前序判断”
- 补了单测：
  - `tests/server-api-llm.test.ts`
  - `tests/workspace.test.tsx`
- 更新了 `scripts/browser-smoke.sh`：
  - 不再依赖旧按钮 `快速新建案件`
  - 走当前首单空态 `直接新建空白案件`
  - 覆盖 evidence -> correction -> summary -> analysis preview
- 在干净 no-db 环境下完成真实浏览器 smoke：
  - `http://127.0.0.1:3007`
  - 首单新建成功
  - correction thinking 成功
  - summary 成功
  - 分析结论预览成功
  - console/page errors 为 0

## Remaining
- 把 `conversationMeta` 继续用于更细的消息/卡片决策，而不是只展示 thinking
- 补第二条真实旅程：
  - 已有案件继续补证据
  - action plan / 8D preview
- 继续减少 UI 里的次级信息块，把更多交互压进消息流
- 评估是否要把 `scripts/browser-smoke.sh` 再拆成两条独立 smoke

## Decisions
| Decision | Rationale |
|----------|-----------|
| 默认反馈以消息为主，卡片只用于结果整理 | 用户明确要求不要按钮台，不要让用户学系统 |
| 不暴露原始思维链，只展示 thinking 步骤摘要 + ETA | 贴近主流 AI 产品做法，也更稳 |
| correction 由系统自动标记 `impactedStages`，不要求用户手动复审 | 用户不会知道这是 D2 还是 D4，需要系统自己判断 |
| 浏览器 smoke 必须更新到当前 UI，而不是继续绑定旧按钮 | 旧 smoke 已失效，会误报前端坏掉 |
| no-db smoke 必须显式 `DATABASE_URL=` 覆盖空值 | `.env.local` 的数据库配置会污染干净环境 |

## Findings
- 当前主链路最稳的 source of truth 是：
  - `components/workspace.tsx`
  - `lib/server/api.ts`
  - `lib/server/serializers.ts`
  - `lib/domain/types.ts`
- `.env.local` 里的 `DATABASE_URL` 会覆盖 no-db 验证；只 `env -u DATABASE_URL` 不够，必须显式 `DATABASE_URL=`
- Playwright MCP 在本机会撞上现有 Chrome 会话，不适合作为这轮主验证工具
- `gstack browse` 在这个仓库里对 `.gstack/browse.json` 和会话持久化比较脆，这轮不适合作为主验证路径
- `tsx` 在当前沙箱里会因为 IPC pipe 权限报 `EPERM`，不适合做临时本地脚本调试
- 真实首单 smoke 已经覆盖到 correction 和 summary，说明这轮核心对话链路不是只在单测里通

## Blockers
- 工具层 blocker：
  - Playwright MCP 会被本机 Chrome 会话污染
  - `gstack browse` 在当前仓库会偶发丢 session
- 产品 blocker：None

## Next Actions
- 继续把 `conversationMeta` 用到消息/卡片决策，而不只是 thinking 状态展示
- 补第二条 smoke：
  - 已有案件
  - 继续补证据
  - action plan / 8D preview
- 再做一轮真实用户旅程检查，重点看“用户零散提问 + 系统自动映射阶段”

## Touched Files
- /Users/jilanfang/ai-quality/components/workspace.tsx
- /Users/jilanfang/ai-quality/docs/mvp-hardening-checklist.md
- /Users/jilanfang/ai-quality/lib/domain/types.ts
- /Users/jilanfang/ai-quality/lib/server/api.ts
- /Users/jilanfang/ai-quality/lib/server/serializers.ts
- /Users/jilanfang/ai-quality/scripts/browser-smoke.sh
- /Users/jilanfang/ai-quality/tests/server-api-llm.test.ts
- /Users/jilanfang/ai-quality/tests/workspace.test.tsx

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test` | passed | 14 files, 103 tests passed |
| `npm run typecheck` | passed | `tsc --noEmit` 通过 |
| browser smoke (basic) | passed | 3005 干净实例通过 evidence -> preview |
| browser smoke (strengthened) | passed | 3007 干净实例通过 first-run -> evidence -> correction -> summary -> preview |

## Restore Notes
- Rebuild `task_plan.md`, `progress.md`, and `findings.md` for the current workspace.
- If multiple snapshots exist, prefer this snapshot only when it is the active one in `.task-archive/current.md`.
