# AGENTS.md instructions for /Users/jilanfang/ai-quality

## 工作原则

- always user first principle. get shit done。
- 测试，再测试。

## 当前权威实现

- 当前产品主链路 / 权威实现是 `Next.js App Router + TypeScript` 单项目。
- `app/`、`components/`、`lib/` 是当前产品化代码与文档判断的主要 source of truth。
- 根目录 `index.html` 仍是活跃的离线 demo / mockup 参考线，可继续用于演示、交互试验和对照验证。
- `backend/` 仍仅作迁移参考，不是当前上线主链路。

## 错误经验

### 1. 不要再把 no-db 模式写成“纯内存模式”

- 当前无数据库模式的真实行为是“本地文件存储”。
- 优先读取 `AI_QUALITY_STORE_PATH`，未设置时回落到 `/tmp/ai-quality-demo-store.json`。
- 之前只靠模块内/全局单例保存 case，在 Next 多路由、多上下文执行下会出现：
  - `POST /api/cases` 创建成功
  - 但 `GET /api/cases` / `GET /api/cases/:id` 读不到
  - 前端表现为 `Case not found`
- 所以后续写文档、讲架构、做 demo 时，必须把 no-db 描述为“本地文件存储”，不要再写成“内存模式”。

### 2. 不要在同一个工作目录里同时跑 `next dev` 和 `next start`

- 两者会共用同一个 `.next` 目录。
- `next dev` 的开发产物可能覆盖 `next build` 的生产产物。
- 真实后果是：
  - 生产首页 HTML 可以打开
  - 但 CSS / JS hash 静态资源会 404
  - 浏览器控制台会出现一串 `_next/static/...` 资源加载失败
- 正确做法：
  - 开发调试时只运行 `npm run dev`
  - 生产验证时执行 `npm run build && npm start`
  - 如果必须并行验证，使用独立工作目录或单独配置 `distDir`

### 3. 本机开发模式优先使用 polling，避免 watcher 爆掉

- 这个项目在当前机器上，裸跑 `next dev` 可能触发 `EMFILE` watcher 问题。
- 当前约定的开发脚本是：

```json
"dev": "WATCHPACK_POLLING=true next dev --hostname 127.0.0.1 --port 3001"
```

- 不要随手改回普通 `next dev`，除非已经重新验证本机 watcher 没问题。

### 3.1 本项目 localhost 端口约定

- 遵循全局端口表，`ai-quality` 的主应用端口块是 `3001-3009`。
- 默认开发端口和默认生产验证端口都是 `3001`。
- 如果同项目需要并发多个实例，再顺延使用 `3002`、`3003`、`3004`。
- 保留的旧 `backend + index.html` 参考链路如果需要单独启动，使用：
  - FastAPI：`8001`
  - 静态页：`3008`
- 不要再把这个项目跑到 `3000`、`8080` 这类跨项目默认口上。

### 4. 生产可用性的判断不能只看接口，要看静态资源和浏览器控制台

- `GET /api/health` 返回 200，不代表页面已经可演示。
- 至少还要检查：
  - 首页能否正常加载
  - `_next/static` 资源是否返回 200
  - 浏览器控制台是否有红色报错
- 这次技术审查里，真正暴露问题的不是 API，而是静态资源 404。

### 5. 小错误也要收口，不要把“控制台噪音”留到 demo 前

- 之前浏览器控制台里唯一残留错误是 `favicon.ico` 404。
- 这类问题不会阻断主流程，但会在 demo、录屏、设计审查时放大不专业感。
- 当前已经补了 `app/icon.svg`，后续保持控制台尽量干净。

### 6. 多模型路由不能只做“模型 fallback”，要按 provider 故障域设计

- 当前国内 LLM 方案不是单一 provider：
  - `vectorengine` 承载 `deepseek-v3.2`、`qwen3.5-122b-a10b`
  - `ark` 承载 `ark-code-latest`
- 所以后续不要把 fallback 只理解成“换一个模型名”，而要区分：
  - 同 provider 内的模型切换
  - provider 整体失败时的跨 provider 切换
- 正确做法是按能力拆配置，而不是只保留全局 `AI_QUALITY_LLM_PROVIDER`：
  - `extract`
  - `copilot`
  - `report`
- 每个能力都应有自己的：
  - `PRIMARY_PROVIDER`
  - `PRIMARY_MODEL`
  - `FALLBACK_PROVIDER`
  - `FALLBACK_MODEL`

### 7. `ark` provider 不能走通用 generic gateway 优先级

- 之前如果同时配置了：
  - `AI_QUALITY_LLM_BASE_URL`
  - `AI_QUALITY_LLM_API_KEY`
  - `AI_QUALITY_LLM_PROVIDER=ark`
- 代码会因为 generic gateway 优先级过高，实际仍然打到 `vectorengine`，而不是 `ark`。
- 真实后果是：
  - 看起来 provider 已切到 `ark`
  - 实际请求却还在走通用 OpenAI 兼容网关
  - 会把 provider 级故障和模型级故障混在一起，误判链路状态
- 后续要保持：
  - `ark` 先匹配自己的 endpoint
  - generic gateway 只服务 `vectorengine` 这一类通用兼容 provider

### 8. 模型 benchmark 要区分“渐进办案能力”和“最终成稿能力”

- 对这个项目，单轮把全部事实一次性塞给模型，只能测“谁更会写完整 8D”，不能测主链路 Copilot 能力。
- 更符合当前产品目标的 benchmark 必须至少分两层：
  - 渐进 6 轮输入，观察是否过早进入 `D4`、下一问是否值钱、`24h` 初稿判断是否克制
  - 完整成稿单测，观察最终 `8D` 是否结构完整、措辞是否保守
- 当前实测结论要记住：
  - `deepseek-v3.2` 更适合主 Copilot
  - `qwen3.5-122b-a10b` 更适合最终正式成稿
  - `ark-code-latest` 是非常有价值的跨 provider 快速备用
  - `MiniMax-M2.7` 这轮在严格 JSON 协议下不稳定，暂不适合进主链路

## 默认验证清单

在声称“能跑”之前，至少重新执行：

```bash
npm test
npm run typecheck
npm run build
```

如果要验证生产链路，再补：

```bash
npm start
curl http://127.0.0.1:3001/api/health
```

如果要验证页面链路，再补浏览器检查：

- 首页能打开
- 新建案件成功
- 案件列表可读
- 浏览器控制台无报错

## 当前 demo 的判断原则

- 现阶段优先级是：`能跑`、`可 demo`、`可部署`
- 不要为了“更优雅”回退已经验证可用的方案
- 如果文档描述与代码行为冲突，以当前代码和 fresh verification 为准

## Backlog 管理

- 当前任务 backlog 的唯一 source of truth 是 `docs/mvp-hardening-checklist.md`
- `index.html -> Next.js` 差异与迁移决策的唯一账本是 `docs/index-html-to-nextjs-migration-ledger.md`
- 不要再为同一批待办并行维护多个任务文档
- `task_plan.md`、`progress.md`、`findings.md` 只用于：
  - 当前线程恢复
  - 阶段判断
  - 关键决策与验证记录
- 这三个文件不再扩展成新的长期 backlog 容器
- 如果出现新的实现待办，先写进 `docs/mvp-hardening-checklist.md`
- 如果出现新的 mockup / 主线差异，先写进 `docs/index-html-to-nextjs-migration-ledger.md`
- 除非是新的架构设计、对外说明或长期产品文档，否则不要为了记录任务再新增 docs 文件
- 如果旧文档只是重复 backlog，而不是提供独立价值，优先删减、合并或改成指向唯一清单
- 所有新需求只收口到主 backlog，按优先级排序执行
- `hotfix bug` 永远优先于其它需求

## Design System

- 做任何视觉、UI、报告样式相关决策前，先读 `DESIGN.md`。
- 字体、颜色、间距、状态语义、工作台气质和报告风格，以 `DESIGN.md` 为当前基线。
- 未经明确讨论，不要随意偏离 `DESIGN.md`。
- 做设计 QA 时，要主动指出与 `DESIGN.md` 不一致的实现。
