# Task Plan: Fireline Sovereign Shell Alignment

## Goal
把当前 ai-quality 的前端升级成参考稿要求的 “Sovereign Shell” 框架，同时保留现有工作台能力与后端 API。

## Success Criteria
- 当前 `/` 页面迁入共享壳层，形成顶部导航 + 左 rail + 中央会话舞台 + 右侧报告抽屉的统一框架
- 视觉和布局尽量贴近参考稿，但内容和文案按 Pin2pin / Fireline 语境改写
- 不改后端 API，现有案件、证据、阶段、报告能力保持可用
- 通过 `npm test`、`npm run typecheck`、`npm run build`、`npm run smoke:browser`

## Scope
- 当前只做“全局壳层 + 当前 `/` 工作台”
- 暂不把 `Anomalies / Insights / Library / History` 做成完整业务页
- 保持现有 `/api/cases*`、`/api/feedback`、`/api/telemetry` 接口不变

## Current Phase
已完成会话优先改版和全部验证；当前处于参考框架迁移的设计已收口、待继续实现阶段。

## Completed Work
- 已完成 `Workspace` 的会话优先改版并验证通过
- 已同步 `DESIGN.md` 的“会话主舞台 + 抽屉辅助区”基线
- 已适配 `tests/workspace.test.tsx`
- 已适配 `scripts/browser-smoke.sh`
- 已完成参考 `code.html` / `DESIGN.md` / `screen.png` 的设计探索
- 已确认：
  - 范围选 `1`：先做全局壳层 + 当前 `/` 工作台
  - 视觉选 `A`：尽量贴近参考图，内容和文案按 Pin2pin 语境改写

## Remaining Work
- 实现共享 `Sovereign Shell`
- 把 `Workspace` 迁入新壳层并继续视觉对齐
- 同步设计系统到更偏 `Sovereign Console / Industrial Manuscript`
- 完成新一轮 fresh verification

## Next Actions
- 恢复后先实现共享壳层
- 再改 `Workspace` 的消息流、header、dock、drawer 细节
- 最后重跑完整验证

## Blockers
- 用户正在换 key，需要在新 key 就位后继续实现

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 本轮先做“全局壳层 + 当前 `/` 工作台” | 当前仓库真实产品页只有 `/`，先把骨架抽稳最值钱 |
| 视觉执行选 `A`：尽量贴近参考图，内容和文案按 Pin2pin 语境改写 | 用户明确选择 `a` |
| 推荐方案是“壳层优先，工作台跟进” | 方便后续其它栏目复用同一框架 |
| 不改后端 API | 当前任务只做前端框架与视觉迁移 |

## Touched Files
- /Users/jilanfang/ai-quality/components/workspace.tsx
- /Users/jilanfang/ai-quality/tests/workspace.test.tsx
- /Users/jilanfang/ai-quality/DESIGN.md
- /Users/jilanfang/ai-quality/scripts/browser-smoke.sh

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test` | passed | `10 files, 70 tests passed` |
| `npm run typecheck` | passed | exit 0 |
| `npm run build` | passed | Next.js production build completed |
| `npm run smoke:browser` | passed | smoke created case, sent evidence, opened report drawer |
