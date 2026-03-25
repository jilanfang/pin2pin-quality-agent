# Task Snapshot: MVP Review And Hardening Plan

## Metadata
- Snapshot ID: 20260325-020126-mvp-review-and-hardening-plan
- Saved At: 2026-03-25 02:01 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260325-020126-mvp-review-and-hardening-plan.md

## Goal
核对当前 ai-quality 的最新代码与文档状态，完成 MVP 架构/设计评审，并锁定下一步硬化动作。

## Success Criteria
- 当前代码、文档、架构判断已经对齐到真实主链路
- fresh verification 通过，能证明当前主链路可跑
- 对 “MVP 是否 still ok” 给出明确结论，而不是停留在感觉判断
- 合并 eng review 与 design review，产出可直接执行的优先级工作清单

## Scope
- 当前真实主链路仅限 `/Users/jilanfang/ai-quality/app`
- 当前真实主链路仅限 `/Users/jilanfang/ai-quality/components`
- 当前真实主链路仅限 `/Users/jilanfang/ai-quality/lib`
- 评审与同步覆盖 `/Users/jilanfang/ai-quality/AGENTS.md`
- 评审与同步覆盖 `/Users/jilanfang/ai-quality/docs`
- UI / UX 评审以 `/Users/jilanfang/ai-quality/DESIGN.md` 为基线

## Current Phase
处于“评审已完成、主链路已核对、文档已同步，接下来进入 MVP hardening 与第一轮 UI 收口”的阶段。

## Completed
- 完成 repo 最新状态核对，明确当前产品主链路是 `Next.js App Router + TypeScript`
- 完成 fresh verification：
  - `node --test deck.test.mjs` 通过，`30 passed`
  - `npm test` 通过，`8 files, 71 tests passed`
  - `npm run typecheck` 通过
  - `npm run build` 通过
- 清理了本地遗留 `3001 / 3002` 进程后，重新验证了干净的 Next 实例：
  - 首页 `200`
  - `/api/health` `200`
  - 匹配的 `_next/static` chunk `200`
- 完成 eng review，结论是当前架构对 MVP 仍然成立，不应现在重写
- 完成 design review，结论是 UI 可用但还没到“资深工程师工作台”质感
- 已同步关键文档与当前现实：
  - `/Users/jilanfang/ai-quality/AGENTS.md`
  - `/Users/jilanfang/ai-quality/docs/README.md`
  - `/Users/jilanfang/ai-quality/docs/current-handoff.md`
  - `/Users/jilanfang/ai-quality/docs/deployment-and-demo.md`
- 新增 `/Users/jilanfang/ai-quality/docs/mvp-hardening-checklist.md`，作为合并后的后续动作清单

## Remaining
- 补一份 `index.html -> Next.js` 的迁移账本，明确哪些是参考链路、哪些仍有迁移债
- 在 `/Users/jilanfang/ai-quality/components/workspace.tsx` 做第一轮 UI / UX 收口
- 做一轮浏览器 smoke test，确认关键交互链路和控制台继续干净
- 给 LLM 错误路径补更好的可观测性
- 验证 Postgres 预览部署链路，把“本地文件存储”和“外部 MVP 存储”边界彻底讲清
- 在继续加功能前，准备 `workspace.tsx` 的最小拆分切口

## Decisions
| Decision | Rationale |
|----------|-----------|
| `Next.js App Router + TypeScript` 是当前唯一主链路 | 代码、fresh verification、页面验证都指向这一实现 |
| 根目录 `index.html` 仍可保留为离线 mockup / 参考链路，但不是产品主链路 | 这样既保留参考价值，也避免继续误导文档和讨论 |
| 当前架构对 MVP 仍然 OK，不做大改造 | 问题主要在边界与运营硬化，不在于主链路跑不通 |
| 无数据库模式必须表述为“本地文件存储”，不是“纯内存模式” | 当前真实行为就是 local file store，之前这里已经踩过坑 |
| 对外 MVP / preview 部署应使用 Postgres，本地文件存储只用于本地 demo | 本地 fallback 方案不适合外部预览或多人环境 |
| 后续在线 LLM 集成继续收敛在 `/Users/jilanfang/ai-quality/lib/server/llm.ts` 边界后面 | 避免 provider / model 细节扩散进 UI 和 domain 层 |
| 接下来优先做 hardening 和 UI 收口，而不是继续铺新功能 | 当前最值钱的工作是把可 demo、可部署、可解释性做稳 |

## Findings
- 当前系统已经不是“能不能跑”的问题，而是“能否稳稳 demo / 预览 / 让专家信”
- 架构主线 `Workspace -> /api -> lib/server/api -> domain -> store` 对 MVP 足够清晰
- `/Users/jilanfang/ai-quality/components/workspace.tsx` 体量已大到需要提前准备拆分切口，但还没到必须现在重构的程度
- UI 主要问题不在审美方向，而在信息层级和工作流优先级：
  - mobile 顺序错了，案件列表在当前 AI 工作区之前
  - 顶部 chips、summary strip、stage card 与 `copilot brief` 重复表达
  - 品牌/文案仍有 `Pin2Pin / 芯科元析 / First Run / scenario` 混用
  - 报告工具入口埋得偏深
  - `新建`、`查看全部阶段` 等点击目标偏小
- `/Users/jilanfang/ai-quality/DESIGN.md` 与当前视觉方向基本一致，但落地细节还没完全收口
- 当前工作目录在这个环境里不是 git root，`git status` 不可用，这会阻碍基于 clean tree 的工作流

## Blockers
- 当前目录不是 git repo / worktree root，无法直接使用完整的 git clean-tree 审查流程
- Postgres preview deployment 这轮还没做 fresh re-verify

## Next Actions
- 先做 `/Users/jilanfang/ai-quality/docs/mvp-hardening-checklist.md` 里的 P0
- 先补 `index.html -> Next.js` 迁移账本，收清参考链路与真实主链路
- 然后在 `/Users/jilanfang/ai-quality/components/workspace.tsx` 做第一轮 UI / UX 收口：
  - mobile 顺序调整
  - 状态层去重
  - 抬高 `copilot brief` 优先级
  - 统一品牌与文案
  - 修正过小触控目标
- 再进入 P1：浏览器 smoke、LLM observability、Postgres preview 验证、`workspace.tsx` 最小拆分准备

## Touched Files
- /Users/jilanfang/ai-quality/AGENTS.md
- /Users/jilanfang/ai-quality/DESIGN.md
- /Users/jilanfang/ai-quality/components/workspace.tsx
- /Users/jilanfang/ai-quality/lib/server/llm.ts
- /Users/jilanfang/ai-quality/lib/server/case-store.ts
- /Users/jilanfang/ai-quality/docs/README.md
- /Users/jilanfang/ai-quality/docs/current-handoff.md
- /Users/jilanfang/ai-quality/docs/deployment-and-demo.md
- /Users/jilanfang/ai-quality/docs/mvp-hardening-checklist.md

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `node --test deck.test.mjs` | passed | `30 passed` |
| `npm test` | passed | `8 files, 71 tests passed` |
| `npm run typecheck` | passed | exit 0 |
| `npm run build` | passed | Next.js production build completed |
| `GET /` on local Next instance | passed | homepage returned `200` on `127.0.0.1:3001` |
| `GET /api/health` on local Next instance | passed | returned `200` on `127.0.0.1:3001` |
| `GET /_next/static/...` sample chunk | passed | matching chunk returned `200` |

## Restore Notes
- Rebuild `task_plan.md`, `progress.md`, and `findings.md` for the current workspace.
- If multiple snapshots exist, prefer this snapshot only when it is the active one in `.task-archive/current.md`.
