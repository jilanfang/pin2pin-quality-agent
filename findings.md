# Findings & Decisions

## Requirements
- 当前代码、文档、架构判断已经对齐到真实主链路
- fresh verification 通过，能证明当前主链路可跑
- 对 “MVP 是否 still ok” 给出明确结论，而不是停留在感觉判断
- 合并 eng review 与 design review，产出可直接执行的优先级工作清单

## Scope Notes
- 当前真实主链路只看 `/Users/jilanfang/ai-quality/app`
- 当前真实主链路只看 `/Users/jilanfang/ai-quality/components`
- 当前真实主链路只看 `/Users/jilanfang/ai-quality/lib`
- 评审与同步覆盖 `/Users/jilanfang/ai-quality/AGENTS.md`
- 评审与同步覆盖 `/Users/jilanfang/ai-quality/docs`
- UI / UX 评审以 `/Users/jilanfang/ai-quality/DESIGN.md` 为基线

## Research Findings
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
- 生产可用性不能只看 `/api/health`，还要看页面、静态资源和浏览器控制台

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| `Next.js App Router + TypeScript` 是当前唯一主链路 | 代码、fresh verification、页面验证都指向这一实现 |
| 根目录 `index.html` 仍可保留为离线 mockup / 参考链路，但不是产品主链路 | 这样既保留参考价值，也避免继续误导文档和讨论 |
| 当前架构对 MVP 仍然 OK，不做大改造 | 问题主要在边界与运营硬化，不在于主链路跑不通 |
| 无数据库模式必须表述为“本地文件存储”，不是“纯内存模式” | 当前真实行为就是 local file store，之前这里已经踩过坑 |
| 对外 MVP / preview 部署应使用 Postgres，本地文件存储只用于本地 demo | 本地 fallback 方案不适合外部预览或多人环境 |
| 后续在线 LLM 集成继续收敛在 `/Users/jilanfang/ai-quality/lib/server/llm.ts` 边界后面 | 避免 provider / model 细节扩散进 UI 和 domain 层 |
| 接下来优先做 hardening 和 UI 收口，而不是继续铺新功能 | 当前最值钱的工作是把可 demo、可部署、可解释性做稳 |

## Issues / Blockers
- 当前目录不是 git repo / worktree root，无法直接使用完整的 git clean-tree 审查流程
- Postgres preview deployment 这轮还没做 fresh re-verify

## Next Actions
- 当前唯一待办 source of truth 是 `/Users/jilanfang/ai-quality/docs/mvp-hardening-checklist.md`
- 先完成 checklist 的 `2.x`
- 再进入 checklist 的 `3.x`
