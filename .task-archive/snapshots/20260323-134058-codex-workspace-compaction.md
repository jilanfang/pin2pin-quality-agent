# Task Snapshot: 8D Copilot 工作台 Codex 化收口

## Metadata
- Snapshot ID: 20260323-134058-codex-workspace-compaction
- Saved At: 2026-03-23 13:40 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260323-134058-codex-workspace-compaction.md

## Goal
把 8D Copilot 的主工作台收成更接近 Codex 的简洁工作台，让对话区和输入框成为绝对主角。

## Success Criteria
- 顶部不再有大块 hero，占用压到最小
- 摘要只保留关键微卡片，不再单独占一大块
- 对话区成为主视觉，输入框固定在底部且始终可见
- 左栏默认轻量，只保留案件列表和新建入口
- 测试、类型检查、构建、生产启动全部通过

## Scope
- `/Users/jilanfang/ai-quality` 当前 Next.js 单体 demo
- 主工作台 UI 结构与交互密度调整
- `components/workspace.tsx` 与对应测试
- 不改 8D 工作流核心业务逻辑
- 不接入真实 LLM provider

## Current Phase
已完成工作台 Codex 化收口与左栏抽屉化，当前适合换线程继续做更细的工具条压缩或下一阶段产品交互。

## Completed
- 将顶部大块 hero 改成薄状态栏，只保留案件名、阶段、D1 状态、案件状态和报告操作
- 将“案件摘要”整块区域改成一条 summary strip 微卡片
- 将对话区扩成主工作区，底部输入区做成固定可见的 composer dock
- 将阶段卡内容裁剪成预览，不再把“已确认上下文”整段暴露给用户
- 将左栏常驻“新建案件”表单改成列表头部 `新建` 按钮，点击后展开轻量创建抽屉
- 新增/更新 UI 回归测试，覆盖紧凑 chrome、summary strip、composer dock、阶段卡裁剪、左栏抽屉化
- 查清 `next start` 500 的原因是 `next dev` 与 `next start` 共用 `.next` 目录造成冲突，不是业务代码问题

## Remaining
- 如需继续收口，可把顶部报告控制区再压成更轻的工具条
- 可进一步把左栏做成更接近线程抽屉的样式与交互
- 可继续优化空态、滚动体验、预览打开方式
- 若进入下一阶段，可回到 LLM Adapter 或部署链路

## Decisions
| Decision | Rationale |
|----------|-----------|
| 工作台参考 Codex，而不是传统双栏仪表盘 | 用户明确要求简洁工作台，对话框必须成为最重要区域 |
| 输入框必须固定在底部主工作区中 | 保证任何滚动和阶段切换下都可立即输入 |
| 摘要只保留关键状态、能力与少量事实 | 降低视觉噪音，避免右侧模块墙回潮 |
| 左栏默认轻量，建案表单改为按需展开 | 首页主屏应尽可能留给对话与输入 |
| `next dev` 与 `next start` 不并行共用同一 `.next` | 避免 chunk 映射冲突造成生产启动假故障 |

## Findings
- 真实浏览器快照表明，顶部高度和左栏重量比之前明显下降后，对话区的存在感才真正出来
- 阶段卡如果直接展示工作流原始文本，很容易重新变回“信息墙”
- `npm run build` 通过并不等于生产校验已完成，仍要单独检查 `next start`
- 生产启动出现的 `Cannot find module './873.js'` 是环境冲突症状，不是页面代码损坏

## Blockers
- None

## Next Actions
- 如果继续做 UI：先压顶部报告控制区，再考虑左栏抽屉的视觉细化
- 如果继续做产品：讨论 D 卡片如何进一步 AI-native 化，而不增加按钮密度
- 如果切回技术主线：恢复 LLM Adapter / provider 接入计划

## Touched Files
- /Users/jilanfang/ai-quality/components/workspace.tsx
- /Users/jilanfang/ai-quality/tests/workspace.test.tsx
- /Users/jilanfang/ai-quality/.task-archive/current.md
- /Users/jilanfang/ai-quality/.task-archive/snapshots/20260323-134058-codex-workspace-compaction.md
- /Users/jilanfang/ai-quality/task_plan.md
- /Users/jilanfang/ai-quality/progress.md
- /Users/jilanfang/ai-quality/findings.md

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test` | passed | 5 个测试文件，20 个测试通过 |
| `npm run typecheck` | passed | `tsc --noEmit` 通过 |
| `npm run build` | passed | Next.js 生产构建通过 |
| `npm run start -- --hostname 127.0.0.1 --port 3005` | passed | 生产态可正常启动并打开首页 |
| 浏览器生产态快照检查 | passed | 左栏默认轻量，仅展示案件列表与 `新建` 入口 |

## Restore Notes
- Rebuild `task_plan.md`, `progress.md`, and `findings.md` for the current workspace.
- If multiple snapshots exist, prefer this snapshot only when it is the active one in `.task-archive/current.md`.
