# Findings & Decisions

## Requirements
- 当前 `/` 页面要迁入共享壳层，形成顶部导航 + 左 rail + 中央会话舞台 + 右侧报告抽屉
- 视觉和布局尽量贴近参考图，但内容和文案按 Pin2pin / Fireline 语境改写
- 不改后端 API，保持现有案件、证据、阶段、报告能力可用
- 本轮只做“全局壳层 + 当前 `/` 工作台”

## Scope Notes
- 暂不把 `Anomalies / Insights / Library / History` 做成完整业务页
- 参考输入来自 `code.html`、`DESIGN.md`、`screen.png`
- 现有 `/api/cases*`、`/api/feedback`、`/api/telemetry` 继续复用

## Research Findings
- 当前仓库真实产品页只有 `/Users/jilanfang/ai-quality/app/page.tsx`
- 参考稿最核心的是壳层构图：
  - 顶部细导航
  - 左 rail
  - 中央会话舞台
  - 右侧报告 panel
  - 底部 command dock
- 参考稿设计语言更偏 `Sovereign Console / Industrial Manuscript`
- `browser-smoke.sh` 需要跟随 UI 演进持续更新 selector，且不能假设总是空态

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 本轮先做“全局壳层 + 当前 `/` 工作台” | 当前仓库真实产品页只有 `/`，先把骨架抽稳最值钱 |
| 视觉执行选 `A`：尽量贴近参考图，内容和文案按 Pin2pin 语境改写 | 用户明确选择 `a` |
| 推荐方案是“壳层优先，工作台跟进” | 方便后续其它栏目复用同一框架 |
| 不改后端 API | 当前任务只做前端框架与视觉迁移 |

## Issues / Blockers
- 用户正在换 key，需要在新 key 就位后继续实现
- 参考框架迁移尚未开始写代码

## Next Actions
- 恢复后先实现共享 `Sovereign Shell`
- 再把 `Workspace` 迁入新壳层并继续贴近参考图
- 最后重跑完整验证
