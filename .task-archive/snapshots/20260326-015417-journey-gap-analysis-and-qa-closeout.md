# Task Snapshot

## Snapshot ID
20260326-015417-journey-gap-analysis-and-qa-closeout

## Saved At
2026-03-26 01:54 CST

## Project Path
/Users/jilanfang/ai-quality

## Task Name
用户旅程 gap 拆解与 QA 收口

## Goal
基于当前 `Pin2pin Fireline` 主线代码，先把真实用户旅程拆到功能点并分析 gap，再通过浏览器 QA 收掉主界面里明显违背“case + 对话唯一主交互”的问题。

## Success Criteria
- 形成基于用户旅程的功能点 / gap 分析，而不是泛泛总结
- 浏览器 QA 找到并修复当前主界面最明显的用户可见问题
- 工作区保持干净，测试和构建全部通过
- 明确下一步最值钱的实现顺序

## Scope
- 只针对 `Next.js` 主线：`app/`、`components/`、`lib/`、`tests/`
- 不继续扩 `index.html` 离线原型
- 不在本轮实现登录、上传、case 深度管理，只做现状分析和主界面 QA 收口

## Current Phase
已完成一轮基于真实浏览器的 QA 收口，并完成“用户旅程 -> 功能点 -> gap -> 优先级”的现状分析。当前处于“准备把旅程分析转成正式 backlog / 实施顺序”的阶段。

## Completed Work
- 跑完 `/qa` 流程并修复 4 个已确认的用户可见问题：
  - 移除壳层假导航和假控件
  - `继续补信息` 不再错误打开预览
  - 移除主界面的 `确认当前阶段` 按钮
  - 让反馈面板与结果预览抽屉互斥
- 更新并通过相关测试：
  - `tests/workspace.test.tsx`
  - `tests/layout.test.tsx`
  - `tests/home-page.test.tsx`
- 完成新一轮浏览器复验，确认：
  - 首页只保留真实入口
  - 主 case 界面没有 `确认当前阶段`
  - `继续补信息` 只展开输入区
  - 控制台无错误
- 做完一版用户旅程分析，当前结论：
  - 核心对话分析旅程：约 `75%-80%`
  - case 管理旅程：约 `40%-50%`
  - 结果沉淀与交付旅程：约 `65%-75%`
  - 对外试用级产品化旅程：约 `30%-40%`
- 明确最该先补的 4 件事：
  - case 管理补齐
  - 登录 / 账号密码 / 用户隔离
  - 多模态证据输入
  - 结果对象产品化

## Remaining Work
- 把当前“旅程分析”整理成正式 backlog 版：
  - `旅程阶段`
  - `用户目标`
  - `已实现`
  - `gap`
  - `优先级`
  - `建议实现顺序`
- 进一步落成开发版拆解：
  - 前端改动
  - API 改动
  - 数据模型改动
  - 测试点
  - 风险
- 如果继续做实现，建议优先进入：
  1. case 重命名 / 归档 / 删除 / 搜索
  2. 最小登录体系
  3. case 与 user 绑定
  4. 图片 / Word / PDF 上传入口
  5. 证据解析进入对话上下文

## Key Product Findings
- 当前最强的一段是“单 case 对话推进分析”
- 当前最薄的一段是“case 管理”和“登录后长期使用”
- `分析结论 / 行动方案 / 8D` 已经能生成，但还不是真正的一等结果对象：
  - 尚未持久化为 case 资产
  - 缺版本历史
  - 缺执行层字段
- 现在可以说“核心分析主旅程已跑通”，但不能说“产品化闭环已跑通”

## Decisions
| Decision | Rationale |
| --- | --- |
| 先用浏览器 QA 收掉主界面假入口和误导动作 | 这些问题会直接伤害真实用户信任，优先级高于继续堆新功能 |
| 当前主界面坚持只保留 `case 管理 + 对话` 两类主操作 | 与用户之前明确的产品真相对齐 |
| 把 `确认当前阶段` 从主界面去掉 | 避免回到按钮驱动的旧流程 |
| 反馈面板与结果预览抽屉做互斥 | 保住会话区面积，符合 AI-native 主舞台 |

## Blockers
- 无硬阻塞
- 下一步主要是产品优先级选择，不是工程卡点

## Next Actions
- 先把旅程分析整理成正式 backlog 表
- 再决定接下来是：
  - 先做 `case 管理`
  - 还是先做 `登录 / 账号密码`
- 如果直接进入实现，推荐先做 `case 管理`，因为它直接对应“用户只操作 case 和对话”的产品承诺

## Touched Files
- /Users/jilanfang/ai-quality/components/sovereign-shell.tsx
- /Users/jilanfang/ai-quality/components/workspace.tsx
- /Users/jilanfang/ai-quality/lib/domain/report-builder.ts
- /Users/jilanfang/ai-quality/tests/layout.test.tsx
- /Users/jilanfang/ai-quality/tests/workspace.test.tsx
- /Users/jilanfang/ai-quality/.gitignore
- /Users/jilanfang/ai-quality/.gstack/qa-reports/qa-report-localhost-3001-2026-03-26.md

## Recent Commits
- `bb627cf` `fix(qa): keep the chat area free of stage and panel clutter`
- `5a55fda` `chore(qa): dedupe gstack ignore entries`
- `80b58eb` `fix(qa): keep evidence actions inside the conversation flow`
- `b7b836c` `fix(qa): remove dead shell navigation controls`
- `bebf5c2` `chore: checkpoint before qa run`

## Verification Status
| Check | Status | Details |
| --- | --- | --- |
| `npm test` | passed | `13 files, 83 tests passed` |
| `npm run typecheck` | passed | exit 0 |
| `npm run build` | passed | Next production build passed |
| Browser QA | passed | 首页、seed case、建议动作、反馈/预览互斥均已复验 |

## Restore Notes
- 当前工作区干净
- 当前最值得继续的不是再做 UI 微调，而是把“旅程 gap”转成正式实现 backlog
- 若明天继续实现，建议先从 `case 管理` 开始
