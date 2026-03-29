# Fireline 用户旅程资产

这里存放 `Pin2pin Fireline` 的用户旅程主账本与结构化场景约束。

当前唯一权威资产：

1. [`fireline-hybrid-user-journey-ledger.md`](/Users/jilanfang/ai-quality/docs/journeys/fireline-hybrid-user-journey-ledger.md)
   混合版用户旅程主账本。按 `用户群 -> case family -> D2-D8` 组织，保存真实业务背景、线索、用户原话、期望 AI 动作与禁区。
2. [`fireline-structured-scenario.schema.json`](/Users/jilanfang/ai-quality/docs/journeys/fireline-structured-scenario.schema.json)
   结构化场景载荷 schema。后续 benchmark、regression、smoke、demo case 统一按这个字段集派生。
3. [`fireline-structured-scenarios.sample.json`](/Users/jilanfang/ai-quality/docs/journeys/fireline-structured-scenarios.sample.json)
   当前已导出的机器可消费样本包。适合直接用于 benchmark、fixture、smoke 输入或下游转换。

使用约束：

- 主账本是唯一 source of truth。
- 结构化载荷是主账本的派生产物，不允许反向单独演化。
- `fireline-structured-scenarios.sample.json` 是当前导出的派生产物，需与 `@/lib/domain/journey-scenarios` 保持一致。
- 结构化场景统一带 `priority` 与 `usageTags`，用于下游筛选 `benchmark / regression / smoke`，但不引入新的业务语义层。
- 如果新增旅程、补场景、改角色语言，先改主账本，再同步结构化载荷。
- 如果某类场景当前产品还无法承接，要在主账本里显式标记 `当前产品 gap`，不要静默删除。
