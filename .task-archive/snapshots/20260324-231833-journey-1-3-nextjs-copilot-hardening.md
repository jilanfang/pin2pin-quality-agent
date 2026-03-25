# Task Snapshot: Journey 1-3 Next.js Copilot Hardening

## Metadata
- Snapshot ID: 20260324-231833-journey-1-3-nextjs-copilot-hardening
- Saved At: 2026-03-24 23:18 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260324-231833-journey-1-3-nextjs-copilot-hardening.md

## Goal
把当前 Next.js 主链路收口成可做封闭测试的 8D / 异常响应 Copilot，先打穿旅程 1（客户客诉突发）和旅程 3（信息极碎），并为旅程 4（老工程师审稿推荐）补信任底座。

## Success Criteria
- 高压客诉进入系统后，系统先控风险、再补证据、再给快速响应版
- 用户面对碎片信息时，每轮只收到一个最高价值问题
- 新证据推翻前序判断时，系统会显式提示复审影响
- D3 / D4 工作稿更像真实质量工程办案，而不是模板提示
- 文本 / HTML 输出更像“敢拿去改”的初稿，而不是原样吐出工作稿
- 关键测试和类型检查通过

## Scope
- 当前真实主链路仅限：
  - /Users/jilanfang/ai-quality/app
  - /Users/jilanfang/ai-quality/components
  - /Users/jilanfang/ai-quality/lib
- 重点文件：
  - /Users/jilanfang/ai-quality/components/workspace.tsx
  - /Users/jilanfang/ai-quality/lib/domain/workflow-engine.ts
  - /Users/jilanfang/ai-quality/lib/domain/guided-thinking.ts
  - /Users/jilanfang/ai-quality/lib/domain/report-builder.ts
  - /Users/jilanfang/ai-quality/tests/workspace.test.tsx
  - /Users/jilanfang/ai-quality/tests/workflow-engine.test.ts
  - /Users/jilanfang/ai-quality/tests/report-builder.test.ts
- 只讨论 8D / 异常响应工具，不扩到 datasheet 工具
- 不改多人协作、企业权限、画布模式

## Current Phase
处于“旅程 1 基本可封闭测试，旅程 3 基本可用，旅程 4 仍差专家信任层收口”的阶段。

## Completed
- 明确当前主链路是 `Next.js App Router + TypeScript`，不是 `backend/` 或根目录 `index.html`
- 工作台已改成更偏 AI-native 的对话主导结构，聊天区是主轴
- 助手回复已统一成三段式：
  - `我现在怎么看`
  - `为什么先问这个`
  - `你只需要补什么`
- 已落地“每轮只推进一个最高价值问题”
- 已识别高压客诉语义，并统一展示层口径为：
  - `快速响应版`
  - `阶段更新版`
  - `完整 8D`
- 已支持新证据推翻旧判断时的显式认知重建：
  - stage impact summary
  - 工作台复审卡
  - 报告文本 / HTML 复审提示
- 已完成 D3 / D4 工作稿业务化收口：
  - D3 变成围堵工作稿，强调四类对象、责任人、完成时点、关闭条件
  - D4 变成双链调查工作稿，强调发生原因链、流出原因链、当前证据、高优先级假设、待验证项
- 已完成报告摘要区收口：
  - `初步判断` 不再原样抬 D4 工作稿标题
  - `客户侧 / 厂内侧当前动作` 不再原样抬 D3 工作稿标题
  - 摘要区更像能继续流转的初稿
- 已完成当前业务判断：
  - 旅程 1：约 `75 / 100`
  - 旅程 3：约 `68 / 100`
  - 旅程 4：约 `50 / 100`
  - 旅程 2：约 `50 / 100`

## Remaining
- 继续收 `report-builder` 的 section 层：
  - 让 D3 / D4 正文章节更像正式报告版内容
  - 内部工作稿信息改成附注或更稳的表达
- 继续补旅程 4 的专家信任层：
  - 发生原因 / 流出原因 / 系统原因再更硬
  - 临时遏制 / 永久纠正 / 预防复发层次更硬
  - 最终让老工程师更容易一眼判断“哪些能用，哪些还在猜”
- 最后再补旅程 2 的技术语境翻译层：
  - 复现条件
  - 样本量
  - 边界条件
  - 对照组

## Decisions
| Decision | Rationale |
|----------|-----------|
| 当前只打旅程 1 和旅程 3 的共享骨架 | 这是最接近商业价值和 AI-native 差异化的主线 |
| 展示层继续用“快速响应版”，不扩大重命名范围 | 内部枚举 `initial_24h` 暂时不动，避免扩大改动面 |
| 任何引导都只保留一个最高价值问题 | 防止退回表单式或 checklist 式追问 |
| 报告层摘要区和 section 正文分开处理 | 摘要服务“可交差”，正文服务“可继续编辑” |
| 当前真实判断以代码和 fresh verification 为准 | 旧文档里关于 `index.html` mockup 主线的部分已过时 |

## Findings
- 当前最接近可封闭测试的是旅程 1，不是旅程 2
- 旅程 3 的价值不在“能不能出 8D”，而在“会不会带着用户收束乱案”
- 当前最大 gap 已经从“能不能跑”变成“专家会不会信”
- 报告摘要区如果原样抬 D3 / D4 工作稿，会明显暴露“内部草稿感”
- 现在的主问题不是技术闭环，而是业务表达和专业边界收口

## Blockers
- 旅程 4 的专家信任层还没闭合，老工程师仍可能觉得“结构对了，但专业边界不够稳”
- 旅程 2 还没有专门的技术语境追问链，暂时只能说“被框架覆盖”，不能说“专门支持”

## Next Actions
- 先改 /Users/jilanfang/ai-quality/lib/domain/report-builder.ts，把 D3 / D4 section 层做成更正式可读的输出
- 再补对应测试，优先在 /Users/jilanfang/ai-quality/tests/report-builder.test.ts 约束正式输出边界
- 然后重新评估旅程 4 的剩余 gap，决定是否继续下探到 D5-D7 的层次硬化

## Touched Files
- /Users/jilanfang/ai-quality/components/workspace.tsx
- /Users/jilanfang/ai-quality/lib/domain/workflow-engine.ts
- /Users/jilanfang/ai-quality/lib/domain/guided-thinking.ts
- /Users/jilanfang/ai-quality/lib/domain/report-builder.ts
- /Users/jilanfang/ai-quality/tests/workspace.test.tsx
- /Users/jilanfang/ai-quality/tests/workflow-engine.test.ts
- /Users/jilanfang/ai-quality/tests/report-builder.test.ts
- /Users/jilanfang/ai-quality/docs/user-journey-gap-analysis.md
- /Users/jilanfang/ai-quality/docs/journey-1-4-execution-plan.md
- /Users/jilanfang/ai-quality/.task-archive/current.md

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test -- --run tests/workspace.test.tsx tests/report-builder.test.ts tests/workflow-engine.test.ts` | passed | `3 files, 48 tests passed` |
| `npm run typecheck` | passed | exit 0 |

## Restore Notes
- 恢复时以 `app/`、`components/`、`lib/` 为唯一代码主线
- 不要再把旧的 `.task-archive` 快照里那条 “`index.html` mockup 主线” 当当前事实
- 当前最合理的继续顺序仍然是：`旅程 1 -> 旅程 3 -> 旅程 4 -> 旅程 2`
