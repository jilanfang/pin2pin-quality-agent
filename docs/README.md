# 8D Copilot 文档索引

当前项目的文档必须按“**双线并存**”来理解：

- 一条是 `Next.js App Router + TypeScript` 主应用
- 一条是根目录 `index.html` 的离线 mockup

最近一轮产品化工作、旅程 hardening 和测试补强主要发生在 `Next.js` 主链路。  
同时，`index.html` 仍保留一条可运行的离线 mockup 线。  
因此，**不要把它当成已废弃文件，但也不要再默认最新主线只在 `index.html`。**

## 先看这些文件

任务管理约定：

- 当前 backlog 只看 [MVP Hardening Checklist](./mvp-hardening-checklist.md)
- mockup / 主线差异只看 [Mockup Migration Ledger](./index-html-to-nextjs-migration-ledger.md)
- 不要再为同一批待办额外新建任务文档

1. [Current Handoff](./current-handoff.md)
   当前最重要的恢复文件。已明确说明：
   - 哪些是当前真实实现
   - 文档和代码哪里漂移了
   - 哪些能力只在 mockup 或只在 Next.js 存在
   - 下一步建议怎么收敛
2. [`../task_plan.md`](/Users/jilanfang/ai-quality/task_plan.md)
   当前最新工作计划，记录的是 `Next.js` 主链路的 journey hardening，不再是旧的 routing 任务描述。
3. [MVP Hardening Checklist](./mvp-hardening-checklist.md)
   当前最适合直接执行的工程清单。回答“这套架构对 MVP 还行不行”“现在必须补什么”“哪些先不要做”。
4. [Mockup Migration Ledger](./index-html-to-nextjs-migration-ledger.md)
   当前 `index.html -> Next.js` 差异账本。回答“mockup 里还有什么没回灌”“哪些该迁、哪些不该迁”。
5. [`../DESIGN.md`](/Users/jilanfang/ai-quality/DESIGN.md)
   当前设计基线。做报告页、工作台、品牌、阶段语义前先读。
6. [`../AGENTS.md`](/Users/jilanfang/ai-quality/AGENTS.md)
   当前协作约束文件。注意其中“权威实现”表述可能滞后于本线程最新事实。

## 按场景阅读

### 如果你继续维护 `index.html` 离线 mockup

优先看：

1. [Current Handoff](./current-handoff.md)
2. [`../index.html`](/Users/jilanfang/ai-quality/index.html)
3. [`../deck.test.mjs`](/Users/jilanfang/ai-quality/deck.test.mjs)
4. [`../DESIGN.md`](/Users/jilanfang/ai-quality/DESIGN.md)

适合的任务：

- UI 调整
- 报告页样式
- 离线阶段流
- 本地导出
- 品牌与 demo 演示改造

### 如果你继续维护 `Next.js` 主应用

优先看：

1. [Current Handoff](./current-handoff.md)
2. [`../components/workspace.tsx`](/Users/jilanfang/ai-quality/components/workspace.tsx)
3. [`../app/page.tsx`](/Users/jilanfang/ai-quality/app/page.tsx)
4. [`../lib/domain/workflow-engine.ts`](/Users/jilanfang/ai-quality/lib/domain/workflow-engine.ts)
5. [`../lib/domain/report-builder.ts`](/Users/jilanfang/ai-quality/lib/domain/report-builder.ts)
6. [`../lib/server/api.ts`](/Users/jilanfang/ai-quality/lib/server/api.ts)

适合的任务：

- API 主链路
- LLM 路由与 provider 接入
- 存储与部署
- 正式产品化工作台
- 把 mockup 能力迁回正式主应用

## 当前推荐阅读顺序

1. [Current Handoff](./current-handoff.md)
2. [MVP Hardening Checklist](./mvp-hardening-checklist.md)
3. [Mockup Migration Ledger](./index-html-to-nextjs-migration-ledger.md)
4. [Deployment and Demo](./deployment-and-demo.md)
5. [`../DESIGN.md`](/Users/jilanfang/ai-quality/DESIGN.md)
6. [`../AGENTS.md`](/Users/jilanfang/ai-quality/AGENTS.md)

## 当前最重要的文档结论

- 当前代码库不是单一文件单一路线
- `Next.js` 是当前权威产品主线，`index.html` 是仍在维护的离线 mockup / demo 线
- 近期新增功能默认优先落在 `Next.js`，除非明确是在做离线 demo 试验

如果文档之间有冲突，以：

1. 当前代码
2. fresh verification
3. [Current Handoff](./current-handoff.md)

为准。
