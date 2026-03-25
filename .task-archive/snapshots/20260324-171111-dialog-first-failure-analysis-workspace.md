# Task Snapshot: Dialog-First Failure Analysis Workspace

## Metadata
- Snapshot ID: 20260324-171111-dialog-first-failure-analysis-workspace
- Saved At: 2026-03-24 17:11 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260324-171111-dialog-first-failure-analysis-workspace.md

## Goal
把当前 mockup 收敛为“失效分析主定位、对话主导、支持图片/Word/PDF 摄取、允许 D4 收口”的单人工具，并同步更新关键产品文档与恢复文件。

## Success Criteria
- 对话主导消息协议已落地
- 图片 / `docx` / `pdf` 能进入统一对话流
- `D4` 后能在对话中建议“继续 / 收口 / 生成摘要 / 生成 8D”
- `D4 final` 成为合法正式收口
- 关键文档与 handoff 同步到“失效分析主定位”
- 回归测试、类型检查、构建都通过

## Scope
- 以根目录 [index.html](/Users/jilanfang/ai-quality/index.html) 的 mockup 主线为准
- 更新 [deck.test.mjs](/Users/jilanfang/ai-quality/deck.test.mjs) 与关键产品文档
- 更新本地恢复文件
- 不迁移 Next.js 主线
- 不扩后端服务

## Current Phase
已完成实现与文档同步，当前处于“归档完成、等待真实浏览器上传 dogfood”的阶段。

## Completed
- 把产品定位改成“失效分析 / 异常响应工具”
- 明确 `8D` 是输出物之一，而不是唯一主线
- 明确当前是单人工具，不做协作
- 在 [index.html](/Users/jilanfang/ai-quality/index.html) 落地对话主导消息协议
- 支持以下消息类型：
  - `text`
  - `attachment_received`
  - `fact_summary_card`
  - `stage_result_card`
  - `decision_prompt`
  - `output_card`
- 把附件入口扩展为：
  - 图片
  - `docx`
  - `pdf`
- 让 `docx/pdf` 提取文本进入当前对话上下文
- 在 `D4` 实现对话内决策：
  - 继续分析
  - 按 `D4` 收口
  - 生成分析摘要
  - 生成 8D
- 支持 `D4 final`
  - 默认输出：`分析摘要`
  - 可选输出：`D4 截止版 8D`
- 保持 `D8` 完整 8D 输出能力
- 更新以下文档：
  - [docs/prd.md](/Users/jilanfang/ai-quality/docs/prd.md)
  - [docs/report-readiness-rules.md](/Users/jilanfang/ai-quality/docs/report-readiness-rules.md)
  - [docs/output-format-design.md](/Users/jilanfang/ai-quality/docs/output-format-design.md)
  - [docs/user-journey-gap-analysis.md](/Users/jilanfang/ai-quality/docs/user-journey-gap-analysis.md)
  - [docs/current-handoff.md](/Users/jilanfang/ai-quality/docs/current-handoff.md)

## Remaining
- 用真实浏览器上传真实 `docx` 文件，确认 `mammoth` 解析链路可用
- 用真实浏览器上传真实 `pdf` 文件，确认 `pdf.js` 解析链路可用
- 继续弱化右侧面板，让主流程更纯粹地待在对话中
- 如需回归 Next.js 主线，把同样的交互协议迁回 [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)

## Decisions
| Decision | Rationale |
|----------|-----------|
| 产品主定位改成“失效分析 / 异常响应工具” | 更符合用户真实使用场景，8D 只是其中一个正式输出 |
| 当前阶段定义为单人工具 | 用户已明确当前暂不需要协作 |
| 主交互必须回到对话中 | 用户主要用自然语言和附件推进案件 |
| `D4 final` 是合法 final | 专家反馈显示很多案件止于 `D4` 就已完成业务闭环 |
| `D4 final` 默认输出 `分析摘要` | 比强行写完整 8D 更真实、更专业 |
| `D4` 仍允许生成 `D4 截止版 8D` | 满足客户或组织仍要求正式 8D 的场景 |
| 文件上传首版支持 `image/docx/pdf` | 这是最小但有效的真实输入面 |

## Findings
- 真实世界中，不是所有案件都值得推进到 `D8`
- 对这类产品来说，“是否继续”的建议比“自动补全到终点”更有价值
- 如果结构化反馈不出现在聊天里，用户会感到流程分裂
- `docx/pdf` 上传如果只做附件留档而不进上下文，就不算真正实现
- 当前 mockup 线已经比 Next.js 主线更贴近这轮用户验证目标

## Blockers
- `docx/pdf` 的真实浏览器二进制解析还没做过 dogfood
- Next.js 主线尚未同步这套交互模型

## Next Actions
- 用真实文件在浏览器里验证 `docx/pdf` 上传和正文提取
- 继续把关键操作入口压回聊天消息
- 评估是否把当前 mockup 交互模型迁回 Next.js 主线

## Touched Files
- /Users/jilanfang/ai-quality/index.html
- /Users/jilanfang/ai-quality/deck.test.mjs
- /Users/jilanfang/ai-quality/docs/prd.md
- /Users/jilanfang/ai-quality/docs/report-readiness-rules.md
- /Users/jilanfang/ai-quality/docs/output-format-design.md
- /Users/jilanfang/ai-quality/docs/user-journey-gap-analysis.md
- /Users/jilanfang/ai-quality/docs/current-handoff.md
- /Users/jilanfang/ai-quality/task_plan.md
- /Users/jilanfang/ai-quality/progress.md
- /Users/jilanfang/ai-quality/findings.md
- /Users/jilanfang/ai-quality/.task-archive/current.md

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `node --test deck.test.mjs` | passed | `30 passed` |
| `npm test` | passed | `8 files, 52 passed` |
| `npm run typecheck` | passed | exit 0 |
| `npm run build` | passed | build completed successfully |

## Restore Notes
- 当前恢复应以 [index.html](/Users/jilanfang/ai-quality/index.html) 的 mockup 主线为准
- 如果后续线程读到旧的“8D Copilot / 必到 D8”表述，应以本快照和更新后的 docs 为准
- 真正还没被现实浏览器验证的只剩 `docx/pdf` 二进制上传路径
