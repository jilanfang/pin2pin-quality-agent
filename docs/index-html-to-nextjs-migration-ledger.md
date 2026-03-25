# `index.html` -> `Next.js` 迁移账本

> 目的：把离线 mockup 里仍有价值、但尚未回灌到 `Next.js` 主应用的能力记成显式 ledger，避免两条线路继续隐性分叉。

> 当前规则：新增产品能力默认落在 `Next.js` 主线。`index.html` 只继续承担离线 demo、交互试验和对照参考；未记入本账本的 mockup 增量默认不继续扩展。

## 1. Source Of Truth

- 产品主线：`app/` + `components/` + `lib/`
- 离线参考线：`index.html`
- 当前主工作台：`/Users/jilanfang/ai-quality/components/workspace.tsx`
- 当前 mockup 参考实现：`/Users/jilanfang/ai-quality/index.html`

## 2. 迁移判断规则

- `Port Now`：应进入当前 P0 / P1，直接影响 demo、试用、信任感或主链路一致性
- `Port Later`：有价值，但不该阻塞当前 MVP hardening
- `Keep In Mockup`：保留在离线演示线，当前不迁回产品主线
- `Skip`：当前不建议迁移

## 3. Ledger

| 能力 | Mockup 状态 | Next.js 状态 | 决策 | 优先级 | 说明 |
|---|---|---|---|---|---|
| 项目重命名 / 删除 | 已实现 | 未实现 | Port Now | P0 | 属于案件管理基本能力，缺失会让主工作台明显弱于 mockup |
| 左侧栏折叠态 | 已实现 | 未实现 | Port Now | P1 | 影响工作台密度和专业感，但不必先于主链路 hardening |
| 品牌头部 `芯科元析 + xkyx-tech-grid.svg` | 已实现 | 未实现，仍有混用 | Port Now | P0 | 当前 `workspace.tsx` 仍有 `Pin2Pin / 芯科元析 / First Run` 混用 |
| 完整报告 Word 导出 | 已实现 | 未实现 | Port Later | P1 | 有演示价值，但当前 HTML 报告链路优先级更高 |
| 完整报告 PDF 导出入口 | 已实现 | 未实现 | Port Later | P1 | 当前先沿用 `HTML -> 浏览器打印 / 后续 PDF` 路线 |
| D1 固定团队成员 | 已实现 | 未实现 | Skip | - | 属于 mockup 演示写死逻辑，不应直接回灌到产品主线 |
| D2 中文 5W1H 强调样式 | 已实现 | 未实现 | Port Later | P1 | 属于正式报告可读性增强，适合跟报告样式一起回灌 |
| 单文件离线 fallback 的完整 `D2 -> D8` mockup 逻辑 | 已实现 | 主线已有独立实现 | Keep In Mockup | - | 这是离线 demo 能力，不应反向污染主链路架构 |
| Word / PDF 正文摄取进对话上下文 | 已实现 | 未实现 | Port Later | P1 | 有价值，但涉及上传、提取与解析边界，不放在本轮 P0 |

## 4. 当前应执行的迁移动作

### P0

- 品牌与文案收口到 `芯科元析` 主叙事
- 补项目重命名 / 删除能力的产品化实现方案
- 在清单里持续跟踪 mockup 与 Next.js 的差距，不再口头记忆

### P1

- 评估左侧栏折叠态迁移
- 评估 Word / PDF 导出入口迁移
- 评估 D2 中文 5W1H 样式迁移
- 评估文件正文摄取能力迁移

## 5. 明确不回灌的内容

- 为了演示方便而写死的 D1 团队名单
- 单文件 fallback 的整套本地状态机实现
- 只服务 mockup 演示节奏、但会污染主线边界的临时交互

## 6. 维护规则

- 新发现的 mockup 差异，先更新本账本，再决定是否开发
- `docs/mvp-hardening-checklist.md` 负责排优先级；本账本负责记“差异和迁移决策”
- 如果账本、handoff、代码描述冲突，以当前代码和 fresh verification 为准
