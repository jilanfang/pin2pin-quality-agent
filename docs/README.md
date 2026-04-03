# Pin2pin Fireline 文档索引

这份索引只做一件事，告诉你现在该看什么，不该把什么当成长期真相。

当前项目主线已经明确：

- 正式产品实现以 `Next.js App Router + TypeScript` 为准
- `app/`、`components/`、`lib/` 是代码主线
- 根目录 `index.html` 仍可作为离线参考或对照，但不是当前产品 source of truth

如果文档和代码冲突，优先级固定为：

1. 当前代码
2. 最新验证结果
3. [`../AGENTS.md`](/Users/jilanfang/ai-quality/AGENTS.md)
4. 本索引列出的权威文档

## 先看什么

新线程接手、继续开发、排查部署或梳理边界时，先按这个顺序读：

1. [产品线定位](./product-line-positioning.md)
   先确认命名、边界和历史名称映射。
2. [运行与部署说明](./deployment-and-demo.md)
   先确认当前运行方式、环境变量、数据库和生产路径。
3. [MVP 加固清单](./mvp-hardening-checklist.md)
   这是长期待办和工程加固的唯一主清单。
4. [用户旅程资产](./journeys/README.md)
   所有 benchmark、regression、demo case 都从这里派生。
5. [`../DESIGN.md`](/Users/jilanfang/ai-quality/DESIGN.md)
   做首页、登录页、工作台和报告样式前先看。

## 文档分层

### 一层：权威文档

这些文件是当前长期 source of truth。

- [产品线定位](./product-line-positioning.md)
  命名、产品边界、历史名称映射。
- [运行与部署说明](./deployment-and-demo.md)
  本地运行、数据库、Vercel、生产基线、环境变量一致性检查。
- [MVP 加固清单](./mvp-hardening-checklist.md)
  长期 backlog 和工程优先级唯一入口。
- [迁移账本](./index-html-to-nextjs-migration-ledger.md)
  只记录 `index.html` 参考线与正式主线的差异和迁移决策。
- [用户旅程资产](./journeys/README.md)
  用户旅程主账本与结构化场景入口。

### 二层：支撑文档

这些文件有用，但不是主 backlog 或架构真相。

- [Fireline GTM 执行文档](./gtm-fireline-execution-2026-03-28.md)
  当前 GTM 主线、case 门诊和试用承接方式。
- [UAT 测试案例](./uat-case-mcu800-c25-reversed-polarity.md)
  用于手工验收、演示和质量回测的真实案例脚本。

### 三层：临时恢复与流程产物

这些文件可以帮助恢复上下文，但不要把它们当长期规范。

- [当前交接说明](./current-handoff.md)
  只用于线程恢复和临时快照，不负责维护长期任务真相。
- [`../task_plan.md`](/Users/jilanfang/ai-quality/task_plan.md)
- [`../progress.md`](/Users/jilanfang/ai-quality/progress.md)
- [`../findings.md`](/Users/jilanfang/ai-quality/findings.md)
- [superpowers/README.md](./superpowers/README.md)
  这里是 agent 生成的 plan 和 spec，保留过程记录，不作为正式产品文档。

### 四层：历史归档

- [archive/README.md](./archive/README.md)
  已过时、已替代或只保留背景价值的历史文档都在这里。

## 不要再这样用文档

- 不要把 `current-handoff.md` 当 backlog。
- 不要在 `task_plan.md`、`progress.md`、`findings.md` 里维护长期任务清单。
- 不要在 `docs/superpowers/` 里找正式产品规则。
- 不要再为同一批工程待办额外新建平行任务文档。

## 维护规则

- 新的长期任务，只更新 [MVP 加固清单](./mvp-hardening-checklist.md)。
- 新的旅程、场景、benchmark 输入，先更新 [用户旅程资产](./journeys/README.md) 指向的主账本。
- 新的部署、环境变量、生产问题处理经验，更新 [运行与部署说明](./deployment-and-demo.md)。
- 新发现的 `index.html` 参考线差异，先更新 [迁移账本](./index-html-to-nextjs-migration-ledger.md)。
- 已失效但仍有背景价值的内容，移入 `docs/archive/`，不要继续混在当前入口里。
