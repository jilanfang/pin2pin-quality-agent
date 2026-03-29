# Findings & Decisions

## Requirements
- 旅程资产要能直接服务 benchmark、regression、smoke
- 不继续过度工程化，不新增平台层
- 要有最小但有效的 P0 API 回归

## Scope Notes
- 保持主账本、TS 样本、JSON 导出的三件套结构
- 这一轮只补元数据和测试消费能力
- 完成后立即切回 release blocker

## Research Findings
- 当前资产链路已经够用，缺的是消费层标记，不是架构重做
- 高价值 API 回归主要集中在疑似新案、回看旧判断、总结请求、行动方案、8D 不抢跑、一句话口径、会议纪要输入
- 过度绑定 assistant 文案会让测试脆弱，应该断言业务语义

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 在 `StructuredJourneyScenario` 上新增 `priority` 和 `usageTags` | 用最小类型扩展满足下游筛选 |
| 用 `journey-scenarios.ts` 内部轻量映射统一打标 | 避免再引入配置文件或生成层 |
| JSON 导出直接同步同一套标记 | 保证下游 benchmark/smoke 可直接消费 |
| API 测试只补 8 条高价值场景 | 少而狠，卡主链路 |

## Issues / Blockers
- 产品 blocker：None
- 工程提醒：仓库存在大量其他未提交改动，后续要避免误碰

## Next Actions
- 继续推进登录与用户隔离
- 修前端主链路 bug
- 做预览部署和种子用户回归
