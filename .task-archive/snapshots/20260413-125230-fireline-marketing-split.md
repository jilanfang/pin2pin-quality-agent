# Task Snapshot: Fireline Marketing Split

## Metadata
- Snapshot ID: 20260413-125230-fireline-marketing-split
- Saved At: 2026-04-13 12:52 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260413-125230-fireline-marketing-split.md

## Goal
在 `fireline.pin2pin.ai` 现有 Next.js 应用内新增公开营销首页与产品页，同时保留原有工作台入口。

## Success Criteria
- `/` 与 `/product` 未登录可访问。
- `/workspace` 为登录后的工作台入口，未登录跳转 `/login`。
- 登录后默认进入 `/workspace`。
- 相关测试、类型检查、构建通过。

## Scope
- 新增营销首页与产品页组件与路由。
- 调整中间件放行公开路径。
- 调整壳层导航，区分营销页与工作台。
- 同步 smoke / e2e / 单测路径。

## Current Phase
已完成主要实现与本地验证，待部署与线上复核。

## Completed
- 新增营销首页与产品页组件并接入路由。
- 新增 `/workspace` 路由作为工作台入口。
- 登录与注册后跳转调整为 `/workspace`。
- 中间件放行 `/` 与 `/product`。
- 更新壳层导航为营销/工作台双态。
- 更新相关测试与 smoke 脚本。

## Remaining
- 部署到 `fireline.pin2pin.ai` 对应 Vercel 项目。
- 线上验证登录与公开页路径。
- 如需，执行需要凭据的浏览器 smoke 流程。

## Decisions
| Decision | Rationale |
|----------|-----------|
| 保留 Vercel 应用作为 `fireline.pin2pin.ai` 主体 | 该域名已指向 Vercel 应用且健康可用，避免切 DNS 到静态站造成断档。 |
| `/workspace` 作为原工作台入口 | 保持登录后路径清晰，避免营销与产品体验混在根路径。 |

## Findings
- `fireline.pin2pin.ai` DNS 指向 Vercel（`76.76.21.21`），`/api/health` 可用。
- 现状未登录访问 `/` 会重定向到 `/login`，因此需做路由拆分。

## Blockers
- 无

## Next Actions
- 部署并验证线上路径与登录跳转。

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

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test -- tests/public-marketing.test.tsx tests/middleware.test.ts tests/auth-panel.test.tsx tests/home-page.test.tsx tests/layout.test.tsx` | passed | 本地通过 |
| `npm run typecheck` | passed | 本地通过 |
| `npm run build` | passed | 本地通过 |

## Restore Notes
- Rebuild `task_plan.md`, `progress.md`, and `findings.md` for the current workspace.
- If multiple snapshots exist, prefer this snapshot only when it is the active one in `.task-archive/current.md`.
