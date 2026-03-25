# Pin2pin Fireline 文档索引

当前产品线定位先看：

1. [产品线定位](./product-line-positioning.md)
   说明本仓库为什么对齐到 `Pin2pin Fireline`，以及它与历史 `8D Copilot` 命名的关系。

当前项目的文档必须按“**双线并存**”来理解：

- 一条是 `Next.js App Router + TypeScript` 主应用
- 一条是根目录 `index.html` 的离线原型

最近一轮产品化工作、产品加固和测试补强主要发生在 `Next.js` 主链路。
同时，`index.html` 仍保留一条可运行的离线原型线。
因此，**不要把它当成已废弃文件，但也不要再默认最新主线只在 `index.html`。**

## 先看这些文件

任务管理约定：

- 当前待办只看 [MVP 加固清单](./mvp-hardening-checklist.md)
- 离线原型 / 主线差异只看 [迁移账本](./index-html-to-nextjs-migration-ledger.md)
- 部署、环境变量和运行边界只看 [运行与部署说明](./deployment-and-demo.md)
- 不要再为同一批待办额外新建任务文档

1. [产品线定位](./product-line-positioning.md)
   当前正式命名、产品边界和历史名称映射。
2. [当前交接说明](./current-handoff.md)
   当前最重要的恢复文件。已明确说明：
   - 哪些是当前真实实现
   - 文档和代码哪里漂移了
   - 哪些能力只在离线原型或只在 Next.js 存在
   - 下一步建议怎么收敛
3. [`../task_plan.md`](/Users/jilanfang/ai-quality/task_plan.md)
   当前最新工作计划，记录的是 `Next.js` 主链路的产品加固，不再是旧的路由任务描述。
4. [MVP 加固清单](./mvp-hardening-checklist.md)
   当前最适合直接执行的工程清单。回答“这套架构对 MVP 还行不行”“现在必须补什么”“哪些先不要做”。
5. [迁移账本](./index-html-to-nextjs-migration-ledger.md)
   当前 `index.html -> Next.js` 差异账本。回答“离线原型里还有什么没回灌”“哪些该迁、哪些不该迁”。
6. [运行与部署说明](./deployment-and-demo.md)
   当前运行、部署、环境变量与外部试用边界。外部预览 / 试用必须使用 Postgres；本地文件存储只用于本机演示。
7. [`../DESIGN.md`](/Users/jilanfang/ai-quality/DESIGN.md)
   当前设计基线。做报告页、工作台、品牌、阶段语义前先读。
8. [`../AGENTS.md`](/Users/jilanfang/ai-quality/AGENTS.md)
   当前协作约束文件。包含 localhost 端口、运行态污染、LLM 接入和待办规则。

## 按场景阅读

### 如果你继续维护 `index.html` 离线原型

优先看：

1. [当前交接说明](./current-handoff.md)
2. [`../index.html`](/Users/jilanfang/ai-quality/index.html)
3. [`../deck.test.mjs`](/Users/jilanfang/ai-quality/deck.test.mjs)
4. [`../DESIGN.md`](/Users/jilanfang/ai-quality/DESIGN.md)

适合的任务：

- 界面调整
- 报告页样式
- 离线阶段流
- 本地导出
- 品牌与演示文案改造

### 如果你继续维护 `Next.js` 主应用

优先看：

1. [当前交接说明](./current-handoff.md)
2. [`../components/workspace.tsx`](/Users/jilanfang/ai-quality/components/workspace.tsx)
3. [`../app/page.tsx`](/Users/jilanfang/ai-quality/app/page.tsx)
4. [`../lib/domain/workflow-engine.ts`](/Users/jilanfang/ai-quality/lib/domain/workflow-engine.ts)
5. [`../lib/domain/report-builder.ts`](/Users/jilanfang/ai-quality/lib/domain/report-builder.ts)
6. [`../lib/server/llm.ts`](/Users/jilanfang/ai-quality/lib/server/llm.ts)
7. [`../lib/server/api.ts`](/Users/jilanfang/ai-quality/lib/server/api.ts)

适合的任务：

- API 主链路
- LLM 路由与模型服务接入
- 存储与部署
- 正式产品化工作台
- 把离线原型能力迁回正式主应用

## 当前推荐阅读顺序

1. [当前交接说明](./current-handoff.md)
2. [MVP 加固清单](./mvp-hardening-checklist.md)
3. [迁移账本](./index-html-to-nextjs-migration-ledger.md)
4. [运行与部署说明](./deployment-and-demo.md)
5. [`../DESIGN.md`](/Users/jilanfang/ai-quality/DESIGN.md)
6. [`../AGENTS.md`](/Users/jilanfang/ai-quality/AGENTS.md)

## 当前最重要的文档结论

- 当前代码库不是单一文件单一路线
- `Next.js` 是当前权威产品主线，`index.html` 是仍在维护的离线原型 / 演示线
- 近期新增功能默认优先落在 `Next.js`，除非明确是在做离线演示试验
- 外部预览 / 试用必须使用 Postgres；本地文件存储只用于本机演示
- 在线模型接入边界在 `lib/server/llm.ts`，不要把接入逻辑散进 domain 层或工作台组件

如果文档之间有冲突，以：

1. 当前代码
2. 最新验证结果
3. [当前交接说明](./current-handoff.md)

为准。
