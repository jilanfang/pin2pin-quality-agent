# Task Plan: Fireline Marketing Split and LLM Prompt Centralization

## Goal
在现有 Next.js 应用里同时保留公开营销路径与工作台入口，并把当前在线 LLM 提示词统一收口到单独目录，方便后续调优。

## Success Criteria
- `/` 与 `/product` 未登录可访问。
- `/workspace` 为登录后的工作台入口，未登录跳转 `/login`。
- 登录后默认进入 `/workspace`。
- `extract`、`conversation`、`copilot` 提示词统一从 `lib/server/prompts/` 管理。
- `lib/server/llm.ts` 不再内联当前在线提示词正文。
- 相关测试、类型检查、构建通过。

## Scope
- 新增营销首页与产品页组件与路由。
- 调整中间件放行公开路径。
- 调整壳层导航，区分营销页与工作台。
- 同步 smoke / e2e / 单测路径。
- 为当前在线提示词新建统一目录与导出入口。
- 为提示词集中管理补最小设计说明与结构测试。

## Current Phase
本地实现与验证已完成；待继续线上部署验证或进入下一轮 prompt 调优。

## Completed Work
- 新增营销首页与产品页组件并接入路由。
- 新增 `/workspace` 路由作为工作台入口。
- 登录与注册后跳转调整为 `/workspace`。
- 中间件放行 `/` 与 `/product`。
- 更新壳层导航为营销/工作台双态。
- 更新相关测试与 smoke 脚本。
- 将 `extract`、`conversation`、`copilot` 提示词从 `lib/server/llm.ts` 抽离到 `lib/server/prompts/`。
- 新增提示词集中管理设计文档与结构保护测试。
- 完成本地 `npm test`、`npm run typecheck`、`npm run build` 验证。

## Remaining Work
- 部署到 `fireline.pin2pin.ai` 对应 Vercel 项目。
- 线上验证登录与公开页路径。
- 如需，执行需要凭据的浏览器 smoke 流程。
- 如继续 LLM 方向，开始在 `lib/server/prompts/` 下调 prompt 文案。
- 决定是否把 `report` 也纳入同一套提示词目录。

## Next Actions
- 部署并验证线上公开页、工作台路径与登录跳转。
- 如继续 LLM 方向，直接从 `lib/server/prompts/` 开始调 prompt。

## Blockers
- None

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 保留 Vercel 应用作为 `fireline.pin2pin.ai` 主体 | 该域名已指向 Vercel 应用且健康可用，避免切 DNS 到静态站造成断档。 |
| `/workspace` 作为原工作台入口 | 保持登录后路径清晰，避免营销与产品体验混在根路径。 |
| 当前在线提示词按能力拆到 `lib/server/prompts/` | 后续调优时不需要再回 `llm.ts` 大文件里找提示词。 |
| 提示词暂时仍保留在 TypeScript 常量里 | 先统一管理与测试保护，不提前引入模板加载系统。 |

## Touched Files
- /Users/jilanfang/ai-quality/app/page.tsx
- /Users/jilanfang/ai-quality/app/product/page.tsx
- /Users/jilanfang/ai-quality/app/workspace/page.tsx
- /Users/jilanfang/ai-quality/components/fireline-marketing-home.tsx
- /Users/jilanfang/ai-quality/components/fireline-product-page.tsx
- /Users/jilanfang/ai-quality/components/auth-panel.tsx
- /Users/jilanfang/ai-quality/components/sovereign-shell.tsx
- /Users/jilanfang/ai-quality/middleware.ts
- /Users/jilanfang/ai-quality/app/globals.css
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
| `npm test -- tests/public-marketing.test.tsx tests/middleware.test.ts tests/auth-panel.test.tsx tests/home-page.test.tsx tests/layout.test.tsx` | passed | 营销页拆分相关本地通过 |
| `npm test -- tests/llm-prompts.test.ts tests/llm-adapter.test.ts` | passed | 提示词集中管理结构测试与 LLM adapter 定向测试通过 |
| `npm test` | passed | 35 个测试文件、235 个测试通过 |
| `npm run typecheck` | passed | TypeScript 无报错 |
| `npm run build` | passed | Next.js 生产构建通过 |
