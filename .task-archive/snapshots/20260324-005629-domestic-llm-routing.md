# Task Snapshot: 8D Copilot Domestic LLM Routing

## Metadata
- Snapshot ID: 20260324-005629-domestic-llm-routing
- Saved At: 2026-03-24 00:56 CST
- Project Path: /Users/jilanfang/ai-quality
- Snapshot Path: .task-archive/snapshots/20260324-005629-domestic-llm-routing.md

## Goal
把 8D Copilot 的国内 LLM 方案收敛成可运行的双 provider 架构，并把按场景主备路由骨架接进当前主链路。

## Success Criteria
- 国内模型 live benchmark 完成，并得到清晰的主备模型结论
- 明确放弃海外模型，不再把 `gpt-5.4` 系列纳入当前方案
- `ark-code-latest` 成功纳入统一评估，而不是只做 smoke test
- `extract` 场景已支持 capability 级 `primary/fallback provider/model`
- 现有测试与类型检查保持通过

## Scope
- 仅处理当前 Next.js 主链路，不动 `backend/`
- 只保留国内模型方案，不继续推进海外模型
- 先把 capability 路由骨架落在 `extract` 场景
- `copilot/report` 先准备配置入口，不在本轮强行扩展业务调用链

## Current Phase
已完成国内模型 live benchmark、双 provider 路由骨架和环境配置收口，当前处于“继续把 copilot/report 真实接线”的阶段。

## Completed
- 真实测试 `vectorengine` 上的国内模型可用性，包括 `qwen3.5-122b-a10b`、`qwen3.5-35b-a3b`、`deepseek-v3.2`、`MiniMax-M2.7`
- 真实测试 `ark-code-latest`，确认其 provider 可用且延迟很低
- 对钽电容爆板案例完成渐进 6 轮 benchmark，而不是单轮全量塞题
- 对国内主力模型补做完整 8D 成稿 benchmark
- 明确国内模型结论：
  - `deepseek-v3.2` 最适合作为主 Copilot
  - `qwen3.5-122b-a10b` 最适合作为最终正式成稿
  - `ark-code-latest` 适合作为跨 provider 快速备用
- 放弃海外模型进入当前方案
- 在 `lib/server/llm.ts` 引入 capability 路由骨架：
  - `extract`
  - `copilot`
  - `report`
- 让 `extractEvidenceWithLlm` 优先读取 `extract` 自己的主备 provider/model 配置
- 修正 `ark` provider 不能被 generic gateway 覆盖的问题
- 在 `.env.local` 落地国内三段式配置
- 补充并通过 `llm-adapter` 回归测试

## Remaining
- 把 `copilot` 与 `report` 两条真实调用链接到 capability 路由
- 在 UI 上走一遍真实案件链路，验证 `extract` 正在使用 `deepseek-v3.2 -> ark-code-latest`
- 如果后续继续优化 benchmark，要把“渐进办案”和“最终成稿”继续分开评估
- 决定是否把 provider 命中情况显式记录到日志或 case 元数据中

## Decisions
| Decision | Rationale |
|----------|-----------|
| 当前阶段完全放弃海外模型 | 真实 benchmark 下，海外模型在当前网关上的最终成稿能力不稳定，不值得继续投入 |
| 国内主方案采用 `deepseek-v3.2 + qwen3.5-122b-a10b + ark-code-latest` | 分别对应主 Copilot、最终成稿、跨 provider 备用 |
| fallback 必须按 provider 故障域设计 | `vectorengine` 与 `ark` 是两个独立 provider，不能只做模型 fallback |
| capability 配置先落在 `extract` 场景 | 当前代码里只有这条链路真实跑通，先做最小闭环 |
| 保留全局旧环境变量作为兼容层 | 减少一次性大改对现有链路的冲击 |

## Findings
- 单轮全量输入只适合测“谁更会写完整 8D”，不适合测主链路 Copilot 能力
- `deepseek-v3.2` 在渐进办案 benchmark 中得分最高，明显更像真实 QE 的推进节奏
- `qwen3.5-122b-a10b` 和 `qwen3.5-35b-a3b` 的完整成稿能力稳定，且没有乱补日期或库存数量
- `ark-code-latest` 的速度非常快，渐进办案表现也足够稳，是很好的跨 provider 容灾方案
- `MiniMax-M2.7` 这轮在严格 JSON 协议下持续 `json_parse_failed`，不适合作为当前主链路模型
- `doubao-seed-1-8` 在现有账号/路由条件下不可用，当前无法纳入公平对比

## Blockers
- `copilot/report` 的 capability 配置虽然已经到位，但业务层尚未真正消费
- `doubao-seed-1-8` 当前账号/路由不可用，不能纳入国内方案

## Next Actions
- 把 `copilot` 与 `report` 两条真实调用面接入 capability 路由
- 补一轮 UI 端真实验证，确认 `extract` 主备 provider 路由在实际案件链路中生效
- 视需要把 provider 命中情况记录到日志或案件元数据

## Touched Files
- /Users/jilanfang/ai-quality/lib/server/llm.ts
- /Users/jilanfang/ai-quality/tests/llm-adapter.test.ts
- /Users/jilanfang/ai-quality/.env.local
- /Users/jilanfang/ai-quality/AGENTS.md

## Verification
| Check | Status | Details |
|-------|--------|---------|
| `npm test -- tests/llm-adapter.test.ts` | passed | 新增 capability 路由测试通过 |
| `npm test` | passed | `52 passed` |
| `npm run typecheck` | passed | 最新一轮通过 |
| `deepseek-v3.2` progressive benchmark | passed | 国内组最佳办案链路 |
| `qwen3.5-122b-a10b` report benchmark | passed | 正式成稿稳定 |
| `ark-code-latest` progressive + report benchmark | passed | 速度快，成稿过线 |

## Restore Notes
- 继续时优先查看 `lib/server/llm.ts`，当前 capability 路由只在 `extract` 真正生效
- `.env.local` 已经按国内三段式主备 provider/model 配好
- 如果要继续扩 LLM 链路，先接 `copilot`，再接 `report`
