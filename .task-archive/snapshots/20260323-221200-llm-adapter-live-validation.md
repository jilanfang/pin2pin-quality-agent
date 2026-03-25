# Task Snapshot: 8D Copilot LLM Adapter Live Validation

## Metadata
- Snapshot ID: 20260323-221200-llm-adapter-live-validation
- Saved At: 2026-03-23 22:12 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260323-221200-llm-adapter-live-validation.md

## Goal
把 8D Copilot 的最小真实 LLM 接入打进 Next.js 主链路，并完成一次真实模型抽取验证。

## Success Criteria
- `POST /api/cases/:id/evidence` 具备可选 LLM 增强链路
- 未配置 LLM 时主链路继续可用
- 已接入多供应商/多模型基础适配能力
- 至少有一次真实 provider 调用成功返回结构化抽取结果
- 工程验证保持通过

## Scope
- 仅处理当前 Next.js 主链路，不动 `backend/`
- 先做最小可用 LLM adapter，不扩展完整 agent orchestration
- 先接 `evidence extraction` 场景，不扩展全部三档模型编排
- 允许使用 `.env.local` 作为当前本地验证配置

## Current Phase
已完成最小可用 LLM 接入与真实 benchmark 调用，当前处于“可继续接 UI 演示链 / 可继续做模型策略收口”阶段。

## Completed
- 在 `lib/server/llm.ts` 新增 OpenAI 兼容 LLM 适配器，支持通用 `baseURL + apiKey` 覆盖，并保留 `qwen/deepseek` provider 位
- 在 `lib/server/api.ts` 的 `postEvidenceHandler` 接入 `extractEvidenceWithLlm`
- 在 `lib/domain/types.ts`、`lib/domain/workflow-engine.ts` 增加 `llmExtraction` 合并能力
- 在 `.env.example` 增加 LLM 相关环境变量
- 新增测试 `tests/llm-adapter.test.ts`、`tests/server-api-llm.test.ts`
- 真实探测 `vectorengine.ai` 的 `/v1/models` 与 `/v1/chat/completions`
- 确认 `gpt-5.4-mini`、`qwen3-next-80b-a3b-instruct`、`qwen3-max`、`qwen3-32b` 可用
- 确认 `qwen3.5-plus`、`qwen-plus-2025-12-01`、`qwen3-8b` 在该网关上返回 500
- 将当前默认本地抽取模型切到 `qwen3-next-80b-a3b-instruct`
- 用钽电容 benchmark 案例完成一次真实结构化抽取

## Remaining
- 把真实 LLM 结果在本地 dev UI 上完整走一遍案件创建 -> 输入证据 -> 观察引导变化
- 根据真实抽取结果修 prompt，减少字段语义误映射
- 决定 demo 阶段默认模型与后续三档模型分配策略
- 如果继续用 `vectorengine.ai`，需要明确哪些模型是真正稳定可用的

## Decisions
| Decision | Rationale |
|----------|-----------|
| 保留规则链路，LLM 作为可选增强而不是替代 | 先确保 demo 可跑与 fallback 稳定 |
| 适配器优先做 OpenAI 兼容协议 | 便于后续切换多供应商 |
| 当前本地默认模型改为 `qwen3-next-80b-a3b-instruct` | 在当前网关上已实测可用 |
| 使用 `.env.local` 保存本地验证配置 | 当前阶段最快完成真实验证 |
| 暂不把 LLM 接入扩到所有输出链路 | 先验证 extraction 质量，再扩范围 |

## Findings
- `vectorengine.ai` 的 `GET /v1/models` 可正常返回模型列表
- 同一网关上不同模型可用性差异很大，不能假设同厂前缀模型都能跑
- `qwen3.5-plus` 在该网关上虽然被口头声明可用，但实际 `chat/completions` 返回 500
- `gpt-5.4-mini` 在该网关上 `chat/completions` 返回 200
- `qwen3-next-80b-a3b-instruct` 的真实抽取结果已经能提到 `customer/model/work_order/line/discovery_time/impact/failure_location/change_point/...`
- 真实抽取质量可用，但字段边界还不够稳，例如把“扣留未发货成品500片和在制300片”写进 `containment_customer_site`

## Blockers
- `vectorengine.ai` 上若坚持使用 `qwen3.5-plus`，当前无法完成真实调用

## Next Actions
- 走一次真实 UI 链路，确认提交证据后服务端确实使用了 `.env.local` 的 LLM 配置
- 复盘 benchmark 抽取结果，收紧 prompt 中对围堵字段的定义
- 视业务优先级决定：
- 若优先国产：继续以 `qwen3-next-80b-a3b-instruct` / `qwen3-32b` 为当前抽取模型
- 若优先稳定：可临时使用 `gpt-5.4-mini` 作为高档抽取模型

## Touched Files
- /Users/jilanfang/ai-quality/lib/server/llm.ts
- /Users/jilanfang/ai-quality/lib/server/api.ts
- /Users/jilanfang/ai-quality/lib/domain/types.ts
- /Users/jilanfang/ai-quality/lib/domain/workflow-engine.ts
- /Users/jilanfang/ai-quality/tests/llm-adapter.test.ts
- /Users/jilanfang/ai-quality/tests/server-api-llm.test.ts
- /Users/jilanfang/ai-quality/tests/workflow-engine.test.ts
- /Users/jilanfang/ai-quality/.env.example
- /Users/jilanfang/ai-quality/.env.local

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm run typecheck` | passed | 最新一轮通过 |
| `npm test` | passed | `41/41` 通过 |
| `npm run build` | passed | Next.js build 通过 |
| `/v1/models` real call | passed | `vectorengine.ai` 返回 200 |
| `gpt-5.4-mini` real chat call | passed | 返回 `ok` |
| `qwen3-next-80b-a3b-instruct` real extraction call | passed | 返回结构化 JSON 抽取 |
| `qwen3.5-plus` real chat call | failed | provider 500 `bad_response_body` |

## Restore Notes
- 下个线程继续时，先检查 `.env.local` 是否还保留当前可用模型配置
- 若要继续真实 UI 验证，优先用 `npm run dev` 然后走案件提交链路
- 若要切回 `qwen3.5-plus`，需要先解决 provider 500 问题
