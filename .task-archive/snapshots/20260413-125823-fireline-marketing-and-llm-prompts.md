# Task Snapshot: Fireline Marketing Split and LLM Prompt Centralization

## Metadata
- Snapshot ID: 20260413-125823-fireline-marketing-and-llm-prompts
- Saved At: 2026-04-13 12:58 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260413-125823-fireline-marketing-and-llm-prompts.md

## Goal
在现有 Next.js 应用里同时保留公开营销路径与工作台入口，并把当前在线 LLM 提示词统一收口到单独目录，方便后续调优。

## Success Criteria
- `/` 与 `/product` 未登录可访问，`/workspace` 为登录后工作台入口。
- `extract`、`conversation`、`copilot` 的提示词不再内联在 `lib/server/llm.ts`。
- 在线提示词统一从 `lib/server/prompts/` 管理。
- 本地 `npm test`、`npm run typecheck`、`npm run build` 通过。

## Scope
- 公开营销首页、产品页、工作台入口与登录跳转改造。
- 中间件、导航、相关测试与 smoke 路径同步。
- 当前在线 LLM 提示词的集中管理，不扩展到历史归档 prompt 草稿。
- 为提示词集中管理补最小设计说明与结构保护测试。

## Current Phase
本地实现与验证已完成；当前存档已覆盖营销页拆分与提示词统一管理，待继续线上部署验证或进入下一轮 prompt 调优。

## Completed
- 新增营销首页与产品页组件并接入 `/` 与 `/product`。
- 新增 `/workspace` 路由作为登录后工作台入口。
- 登录与注册后跳转调整为 `/workspace`。
- 中间件放行 `/` 与 `/product`，壳层导航调整为营销 / 工作台双态。
- 将当前在线提示词从 `lib/server/llm.ts` 抽离到 `lib/server/prompts/`。
- 新增提示词集中管理设计文档与结构测试，防止提示词重新回流到 `llm.ts`。
- 已完成本地全量测试、类型检查与生产构建验证。

## Remaining
- 部署并验证 `fireline.pin2pin.ai` 上的 `/`、`/product`、`/workspace` 与登录跳转。
- 如继续 LLM 方向，开始直接在 `lib/server/prompts/` 下做文案调优与能力扩展。
- 决定是否需要把 `report` 也纳入同一套 prompt 管理方式。

## Decisions
| Decision | Rationale |
|----------|-----------|
| 保留 Vercel 上的同一个 Next.js 应用承载营销页和工作台 | 避免切 DNS 或拆站带来的发布与验证复杂度。 |
| `/workspace` 作为原工作台入口 | 让公开营销路径与登录后操作路径清晰分离。 |
| 当前在线提示词按能力拆到 `lib/server/prompts/` | 符合现有 capability 路由结构，后续调优定位更直接。 |
| 提示词暂时仍保留在 TypeScript 常量里 | 先获得统一管理与可测试性，不提前引入模板加载系统。 |
| `lib/server/llm.ts` 只保留路由、请求、超时与解析 | 减少提示词内容和调用逻辑耦合。 |

## Findings
- 旧的 `current.md` 只记录了营销页拆分，没有覆盖后续完成的提示词统一管理。
- 仓库里当前真实在线的提示词已经集中在 `lib/server/prompts/`，并且 `llm.ts` 已改为从该目录导入。
- 当前工作区仍包含营销页拆分相关未提交改动；本次存档把这批改动与提示词统一管理一起纳入恢复上下文。

## Blockers
- None

## Next Actions
- 部署并验证线上公开页、工作台路径与登录跳转。
- 如果先做 LLM 方向，直接从 `lib/server/prompts/` 开始调 `extract`、`conversation`、`copilot` 的文案。
- 评估是否把 `report` prompt 也纳入同一目录与同一测试保护模式。

## Touched Files
- /Users/jilanfang/ai-quality/app/page.tsx
- /Users/jilanfang/ai-quality/app/product/page.tsx
- /Users/jilanfang/ai-quality/app/workspace/page.tsx
- /Users/jilanfang/ai-quality/components/fireline-marketing-home.tsx
- /Users/jilanfang/ai-quality/components/fireline-product-page.tsx
- /Users/jilanfang/ai-quality/components/auth-panel.tsx
- /Users/jilanfang/ai-quality/components/sovereign-shell.tsx
- /Users/jilanfang/ai-quality/app/globals.css
- /Users/jilanfang/ai-quality/middleware.ts
- /Users/jilanfang/ai-quality/scripts/browser-smoke.mjs
- /Users/jilanfang/ai-quality/scripts/check-login-redirect.mjs
- /Users/jilanfang/ai-quality/tests/public-marketing.test.tsx
- /Users/jilanfang/ai-quality/tests/home-page.test.tsx
- /Users/jilanfang/ai-quality/tests/auth-panel.test.tsx
- /Users/jilanfang/ai-quality/tests/middleware.test.ts
- /Users/jilanfang/ai-quality/tests/e2e-browser/investigation.spec.ts
- /Users/jilanfang/ai-quality/lib/server/llm.ts
- /Users/jilanfang/ai-quality/lib/server/prompts/index.ts
- /Users/jilanfang/ai-quality/lib/server/prompts/extract.ts
- /Users/jilanfang/ai-quality/lib/server/prompts/conversation.ts
- /Users/jilanfang/ai-quality/lib/server/prompts/copilot.ts
- /Users/jilanfang/ai-quality/lib/server/prompts/types.ts
- /Users/jilanfang/ai-quality/docs/superpowers/specs/2026-04-08-unify-llm-prompts-design.md
- /Users/jilanfang/ai-quality/tests/llm-prompts.test.ts

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test -- tests/llm-prompts.test.ts tests/llm-adapter.test.ts` | passed | 提示词集中管理结构测试与 LLM adapter 定向测试通过。 |
| `npm test` | passed | 35 个测试文件、235 个测试通过。 |
| `npm run typecheck` | passed | TypeScript 无报错。 |
| `npm run build` | passed | Next.js 生产构建通过。 |

## Restore Notes
- 先读 `.task-archive/current.md`，再读本快照。
- 当前恢复重点不是重建设计讨论，而是明确两条并行进度都已在本地完成实现。
- 恢复后先决定优先级：先做线上部署验证，还是继续提示词调优。
