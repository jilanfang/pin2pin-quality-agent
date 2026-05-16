# Findings & Decisions

## Requirements
- `/` 与 `/product` 未登录可访问。
- `/workspace` 为登录后的工作台入口，未登录跳转 `/login`。
- 登录后默认进入 `/workspace`。
- `extract`、`conversation`、`copilot` 提示词需要统一在一个地方管理，方便后续调优。

## Scope Notes
- 营销页与工作台共用同一 Next.js 应用，但路由与导航分离。
- smoke / e2e / 单测需同步更新路径。
- 只统一当前真实在线的提示词，不扩展到历史归档 prompt 草稿。

## Research Findings
- `fireline.pin2pin.ai` DNS 指向 Vercel（`76.76.21.21`），`/api/health` 可用。
- 现状未登录访问 `/` 会重定向到 `/login`。
- 当前真实在线提示词此前集中在 `lib/server/llm.ts`，适合按 capability 拆到独立目录。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 保留 Vercel 应用作为 `fireline.pin2pin.ai` 主体 | 该域名已指向 Vercel 应用且健康可用，避免切 DNS 到静态站造成断档。 |
| `/workspace` 作为原工作台入口 | 保持登录后路径清晰，避免营销与产品体验混在根路径。 |
| 当前在线提示词统一收口到 `lib/server/prompts/` | 后续调优不必在 `llm.ts` 里翻找大段调用逻辑。 |
| 提示词先保留在 TypeScript 常量中 | 先解决统一管理和测试保护，暂不引入模板加载。 |

## Issues / Blockers
- None

## Next Actions
- 部署并验证线上公开页、工作台路径与登录跳转。
- 如继续 LLM 方向，直接从 `lib/server/prompts/` 开始调 prompt。
