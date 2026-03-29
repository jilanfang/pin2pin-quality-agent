# Task Plan: Fireline 用户旅程资产最小收口

## Goal
把 Fireline 用户旅程资产收口成可直接服务 benchmark、regression、smoke 的轻量资产，不再继续过度工程化。

## Success Criteria
- `StructuredJourneyScenario` 带有 `priority` 和 `usageTags`
- TS 样本包与 JSON 导出保持完全对齐
- 至少一小组 P0 API 回归覆盖关键用户旅程
- 三层测试和 typecheck 通过

## Scope
- 只补旅程资产的可消费性，不新增 DSL、runner、生成系统
- 只改 `docs/journeys/`、`lib/domain/journey-scenarios.ts`、相关类型和测试
- 不在这轮继续扩 benchmark 平台

## Current Phase
旅程资产最小收口已完成，下一步应切回 release blocker。

## Completed Work
- 给 `StructuredJourneyScenario` 增加 `priority` 和 `usageTags`
- 用轻量映射给全部结构化场景打标
- 同步更新机器导出 JSON 和文档说明
- 扩充 API 回归到 8 条高价值场景
- 三层测试和 typecheck 已通过

## Remaining Work
- 处理登录与用户隔离
- 收口前端主链路 bug
- 做预览部署验证和种子用户试用回归

## Next Actions
- 从 release blocker 开始，不再继续扩旅程资产系统
- 优先排查主链路可用性：新建案件、对话输入、预览与案件推进

## Blockers
- 产品 blocker：None
- 工程提醒：仓库当前有大量并行未提交改动，后续改动要控制范围

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 保持主账本 + TS 样本 + JSON 导出的三件套 | 已足够支撑当前消费需求 |
| 元数据只加 `priority` 和 `usageTags` | 最小可用，不引入新系统 |
| API 回归只补高价值 P0 场景 | 用最少测试卡住主链路语义 |
| 8D 请求测试只断言“不直跳 final” | 保持测试卡业务语义而不是绑定实现文案 |

## Touched Files
- /Users/jilanfang/ai-quality/docs/journeys/README.md
- /Users/jilanfang/ai-quality/docs/journeys/fireline-structured-scenarios.sample.json
- /Users/jilanfang/ai-quality/lib/domain/journey-scenarios.ts
- /Users/jilanfang/ai-quality/lib/domain/types.ts
- /Users/jilanfang/ai-quality/tests/journey-scenario-api.test.ts
- /Users/jilanfang/ai-quality/tests/journey-scenario-assets.test.ts
- /Users/jilanfang/ai-quality/tests/journey-scenarios.test.ts

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test -- tests/journey-scenarios.test.ts tests/journey-scenario-assets.test.ts tests/journey-scenario-api.test.ts` | passed | 15 tests passed |
| `npm run typecheck` | passed | `tsc --noEmit` passed |
