# Task Plan: Journey Gap Analysis And QA Closeout

## Goal
基于当前 `Pin2pin Fireline` 主线代码，把用户旅程拆到功能点并分析 gap，同时收掉主界面里违背“case + 对话唯一主交互”的明显问题。

## Success Criteria
- 形成可执行的用户旅程 gap 判断
- 完成真实浏览器 QA 并修掉主界面关键误导问题
- 工作区干净，验证通过
- 明确下一步最值钱的实现顺序

## Scope
- 只针对 `Next.js` 主线
- 只做旅程分析和主界面 QA 收口
- 不在本轮实现登录、上传、case 深度管理

## Current Phase
已完成 QA 收口和旅程级 gap 分析；当前准备转成正式 backlog / 实施顺序。

## Completed Work
- 完成 `/qa` 并修复 4 个用户可见问题
- 完成旅程级实现 / gap 分析
- 明确当前最薄弱的两段：
  - case 管理
  - 登录后长期使用
- 明确下一轮最值得优先补的 4 件事：
  - case 管理补齐
  - 登录 / 账号密码 / 用户隔离
  - 多模态证据输入
  - 结果对象产品化

## Remaining Work
- 把旅程分析整理成正式 backlog 表
- 在 `case 管理` 和 `登录 / 账号密码` 之间确定下一步实施项
- 如继续实现，优先进入 case 管理能力

## Next Actions
- 输出 backlog 版硬表：
  - 旅程阶段
  - 用户目标
  - 当前已实现
  - 关键 gap
  - 优先级
  - 建议落地顺序
- 然后开始第一项实现：case 管理

## Blockers
- 无硬阻塞
- 仅需产品优先级决策

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 优先先修主界面误导问题，而不是继续堆功能 | 假入口和误导按钮会直接伤害真实用户信任 |
| 当前主界面继续坚持 `case + 对话` 两类主操作 | 对齐用户已确认的产品真相 |
| 下一步实现优先考虑 case 管理 | 这是当前产品承诺与实际能力差距最大的点之一 |

## Touched Files
- /Users/jilanfang/ai-quality/components/sovereign-shell.tsx
- /Users/jilanfang/ai-quality/components/workspace.tsx
- /Users/jilanfang/ai-quality/lib/domain/report-builder.ts
- /Users/jilanfang/ai-quality/tests/layout.test.tsx
- /Users/jilanfang/ai-quality/tests/workspace.test.tsx
- /Users/jilanfang/ai-quality/.gstack/qa-reports/qa-report-localhost-3001-2026-03-26.md

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test` | passed | `13 files, 83 tests passed` |
| `npm run typecheck` | passed | exit 0 |
| `npm run build` | passed | Next.js production build completed |
| Browser QA | passed | 首页、seed case、建议动作、反馈/预览互斥均已复验 |
