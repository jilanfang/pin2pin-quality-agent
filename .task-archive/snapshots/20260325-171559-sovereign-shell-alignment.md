# Task Snapshot: Fireline Sovereign Shell Alignment

## Metadata
- Snapshot ID: 20260325-171559-sovereign-shell-alignment
- Saved At: 2026-03-25 17:15 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260325-171559-sovereign-shell-alignment.md

## Goal
把当前 ai-quality 的前端升级成参考稿要求的 “Sovereign Shell” 框架，同时保留现有工作台能力与后端 API。

## Success Criteria
- 当前 `/` 页面迁入共享壳层，形成顶部导航 + 左 rail + 中央会话舞台 + 右侧报告抽屉的统一框架
- 视觉和布局尽量贴近参考稿，但内容和文案按 Pin2pin / Fireline 语境改写
- 不改后端 API，现有案件、证据、阶段、报告能力保持可用
- 通过 fresh verification：`npm test`、`npm run typecheck`、`npm run build`、`npm run smoke:browser`

## Scope
- 当前只做“全局壳层 + 当前 `/` 工作台”
- 暂不把 `Anomalies / Insights / Library / History` 做成完整业务页
- 保持现有 `/api/cases*`、`/api/feedback`、`/api/telemetry` 等接口不变
- 参考输入来自：
  - `/Users/jilanfang/Downloads/stitch/code.html`
  - `/Users/jilanfang/Downloads/stitch/DESIGN.md`
  - `/Users/jilanfang/Downloads/stitch/screen.png`

## Current Phase
已完成上一轮“会话优先改版”并全部验证通过；新一轮“参考框架对齐”处于设计确认后的待续接状态，已完成上下文探索和方向收口，等待换 key 后继续实现。

## Completed
- 已完成 `/Users/jilanfang/ai-quality/components/workspace.tsx` 的会话优先改版：
  - 左侧改成窄 rail + 可展开案件抽屉
  - 顶部压成轻导航
  - 报告操作移入消息区
  - 右侧预览改成默认关闭的 overlay drawer
  - 主界面移除 `解锁` / `复审`
  - 输入区改成单行浮动 dock，可展开/收起
- 已同步 `/Users/jilanfang/ai-quality/DESIGN.md`，把“会话主舞台 + 抽屉辅助区”写成当前基线
- 已重写 `/Users/jilanfang/ai-quality/tests/workspace.test.tsx`，让测试断言与新版交互一致
- 已更新 `/Users/jilanfang/ai-quality/scripts/browser-smoke.sh`，适配新的输入 dock、消息内报告入口与“快速新建案件”入口
- 已完成 fresh verification：
  - `npm test` 通过，`10 files, 70 tests passed`
  - `npm run typecheck` 通过
  - `npm run build` 通过
  - `npm run smoke:browser` 通过
- 已完成对参考框架的设计探索：
  - 读完参考 `code.html` / `DESIGN.md`
  - 明确当前仓库真实产品页只有 `/`
  - 用户确认本轮范围为“先做全局壳层 + 当前 `/` 工作台”
  - 用户确认视觉力度选 `A`：尽量贴近参考图，内容与文案按 Pin2pin 语境改写
- 已给出推荐实施方向：先抽共享 `Sovereign Shell`，再把 `Workspace` 迁入壳层

## Remaining
- 在共享壳层中实现参考稿的：
  - 顶部导航
  - 左侧功能 rail
  - 右侧报告 panel rail / drawer
  - 中央主舞台容器
- 把当前 `Workspace` 的内部布局继续贴近参考稿：
  - 上方 context header
  - 更硬朗的消息卡
  - 更接近参考稿的输入 dock
  - 右侧 drawer 的视觉语法统一
- 同步设计系统到更偏 `Sovereign Console / Industrial Manuscript`
- 视需要补新的共享 shell 测试

## Decisions
| Decision | Rationale |
|----------|-----------|
| 本轮先做“全局壳层 + 当前 `/` 工作台” | 当前仓库真实产品页只有 `/`，先把骨架抽稳最值钱 |
| 视觉执行选 `A`：尽量贴近参考图，内容和文案按 Pin2pin 语境改写 | 用户明确选择 `a` |
| 推荐方案是“壳层优先，工作台跟进” | 这样后续其它栏目可以复用同一框架，不会再次返工 |
| 不改后端 API | 这轮是前端框架与视觉迁移，不动后端能力边界 |

## Findings
- 当前仓库真实页面入口只有 `/Users/jilanfang/ai-quality/app/page.tsx`，其它顶栏栏目还没有对应业务页
- 参考稿最核心的不是某一个卡片，而是整体构图：
  - 顶部细导航
  - 左 rail
  - 中央会话舞台
  - 右侧可展开报告面板
  - 底部悬浮 command dock
- 参考稿设计语言更偏 `Sovereign Console / Industrial Manuscript`，特点是：
  - 边界靠 surface 层级而不是重边框
  - 圆角更小
  - 信息密度更高
  - 更像技术台 / 仪表盘而不是 SaaS 卡片
- `browser-smoke.sh` 在这轮中暴露了两个真实适配点：
  - 旧 selector 仍指向老输入框和旧报告入口
  - 脚本不能再假设页面总是空态，因为案件现在走本地文件存储

## Blockers
- 用户正在换 key，需要在新 key 就位后继续实现
- 新一轮 `Sovereign Shell` 方案已收口，但还没有开始代码实现

## Next Actions
- 先恢复到本快照
- 以“壳层优先，工作台跟进”开始实现共享 `Sovereign Shell`
- 优先改：
  - `app/layout.tsx`
  - 共享 shell 组件（如果新增）
  - `components/workspace.tsx`
  - 对应测试
- 实现后重新跑：
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run smoke:browser`

## Touched Files
- /Users/jilanfang/ai-quality/components/workspace.tsx
- /Users/jilanfang/ai-quality/tests/workspace.test.tsx
- /Users/jilanfang/ai-quality/DESIGN.md
- /Users/jilanfang/ai-quality/scripts/browser-smoke.sh

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test -- tests/workspace.test.tsx` | passed | `14 tests passed` after the conversation-first redesign |
| `npm test` | passed | `10 files, 70 tests passed` |
| `npm run typecheck` | passed | exit 0 |
| `npm run build` | passed | Next.js production build completed |
| `npm run smoke:browser` | passed | smoke created case, sent evidence, opened report drawer, no failed responses or console/page errors |
| 参考框架探索 | passed | reference HTML, DESIGN and screenshot reviewed; scope and visual direction confirmed by user |

## Restore Notes
- Rebuild `task_plan.md`, `progress.md`, and `findings.md` for the current workspace.
- If multiple snapshots exist, prefer this snapshot only when it is the active one in `.task-archive/current.md`.
