# MVP Hardening Checklist

> 目的：把当前工程评审结论收口成一份可执行清单，避免后续继续在“是否已经够 MVP”上反复讨论。

> 当前判断：`Next.js App Router + TypeScript` 是产品主线。当前架构对 MVP 仍然成立，不需要推翻重做；但在从本地 demo 走向外部试用前，必须补几项工程硬化。

> 2026-03-25 约定：这份文件是当前 `eng review + design review` 后续动作的唯一待办清单。
> `task_plan.md`、`progress.md`、`findings.md`、`current-handoff.md` 只保留摘要、阶段判断和验证记录，不再各自维护平行 TODO。
> 如果后续评审再产生新动作，先同步到这里，再更新其它文档。
> 除非确实需要独立的设计 / 架构 / 对外说明文档，否则不要再新建 docs 文件来单独记任务。
> 所有新需求只收口到本清单，按优先级执行；`hotfix bug` 永远优先。

## 1. 当前结论

当前架构仍然适合 MVP，前提是严格遵守以下边界：

- 单仓单体应用，不拆微服务
- 当前主链路仍以规则 / 状态机驱动为主
- LLM 目前只作为可选增强，不作为主流程硬依赖
- 本地文件存储只用于本机 demo，不用于外部可部署环境
- 新增产品能力默认继续落在 `Next.js` 主线，不继续让 `index.html` 和主应用隐性分叉

## 2. 必须现在做

这些事项不做，MVP 的工程边界会不清楚，后面容易反复返工。

### 2.1 明确部署边界

- [ ] 在部署说明、README、环境配置说明里明确写死：
  - 本地 demo 可用本地文件存储
  - 外部试用 / 预览部署必须使用 Postgres
- [ ] 不再把 `/tmp/ai-quality-demo-store.json` 描述成可对外试用方案
- [ ] 为部署环境准备一份最小 env 清单：
  - `DATABASE_URL`
  - 可选的 `AI_QUALITY_LLM_*` 配置

### 2.2 固定 LLM 接入边界

- [ ] 约定后续所有在线模型调用只能经由 `lib/server/llm.ts`
- [ ] 不允许在：
  - `workflow-engine.ts`
  - `guided-thinking.ts`
  - `report-builder.ts`
  - `components/workspace.tsx`
  里直接写 provider / model / endpoint 逻辑
- [ ] 如果后续要接 `copilot` 或 `report` 级 LLM，优先先补 facade/router 边界，再补能力

### 2.3 建立 mockup 回灌账本

- [x] 写一份 `index.html -> Next.js` 的迁移清单
- [x] 至少记账这些尚未完全回灌的能力：
  - 项目重命名 / 删除
  - 侧栏折叠态
  - Word / PDF 导出入口
  - D1 固定团队成员
  - D2 中文 5W1H 样式
  - 品牌呈现差异
- [ ] 迁移账本已落在 [`index-html-to-nextjs-migration-ledger.md`](./index-html-to-nextjs-migration-ledger.md)，后续按账本持续更新
- [ ] 没进账本的 mockup 新功能，默认不再新增

### 2.4 把运行态污染写入团队操作常识

- [ ] 保持 `npm run dev` 使用 polling，不随手改回裸 `next dev`
- [ ] 不在同一工作目录混跑 `next dev` 和 `next start`
- [ ] 如果需要生产验证，先 `npm run build`，再单独起 `next start`
- [ ] 先查端口再起服务：
  - `3001` 作为默认应用端口
  - 并行实例顺延到 `3002+`

### 2.5 第一轮工作台 UI / UX 收口

- [x] 调整 mobile 信息顺序
  - 确保“当前案件 / 当前阶段 / 当前目标”优先于案件列表
- [ ] 去重重复状态层
  - 收敛顶部 chips、summary strip、stage card、`copilot brief` 的重复表达
- [x] 抬高 `copilot brief` 与下一步动作的视觉优先级
  - 让页面先回答“现在先补什么”，再展示次级状态信息
- [x] 把报告工具入口抬到更容易发现的位置
  - 避免预览 / HTML 报告入口埋得过深
- [x] 统一品牌与文案
  - 收口 `Pin2Pin / 芯科元析 / First Run / scenario` 的混用
- [x] 修正过小触控目标
  - 优先处理 `新建`、`查看全部阶段` 等高频点击区域
- [x] 首单引导与空状态补齐
  - 明确告诉用户第一步做什么、什么时候能看到第一版结果
  - 空状态下给出清晰的“下一步”提示

## 3. 发布前必须做

这些不一定今天就做，但在对外试用或 MVP 发布前必须补上。

### 3.1 真实浏览器 smoke

- [ ] 增加一条最小真实浏览器 smoke 流程
- [ ] 覆盖路径：
  - 打开首页
  - 新建空白案件或载入种子案例
  - 输入一条证据
  - 生成报告预览
- [ ] 验证项：
  - 页面可加载
  - API 返回正常
  - `_next/static` 资源正常
  - 浏览器控制台无报错

### 3.2 错误路径可观测性

- [ ] 给 LLM fallback 增加可观测日志或最小调试信息
- [ ] 区分这些失败类型：
  - provider 无配置
  - provider 请求失败
  - provider 返回非 JSON
  - fallback 后仍失败
- [ ] 避免把所有问题都变成“静默退回规则抽取”，至少要能在服务端定位原因

### 3.3 部署环境收口

- [ ] 完成一次真实 Postgres 联调
- [ ] 用 Postgres 跑通：
  - 创建案件
  - 读案件列表
  - 发证据
  - 生成预览
  - Final 结案
- [ ] 完成一次预览部署验证

### 3.4 工作台拆分准备

- [ ] 在继续追加 Journey 2 / 导出 / 更多报告工具前，先拆 `components/workspace.tsx`
- [ ] 拆分方向优先保持最小 diff：
  - sidebar / case list
  - report tools tray
  - conversation shell
  - review / brief cards
- [ ] 保持状态仍集中在一处，不要过早引入复杂状态库

### 3.5 试用反馈闭环

- [ ] 页面内反馈入口
  - 固定可见入口 + 最短分类（看不懂 / 结果不专业 / 报错 / 其他）
- [ ] 最小行为埋点
  - 打开工作台 / 新建案件 / 加载种子案例 / 发送证据 / 生成预览 / 生成 final / 报错
- [ ] 种子用户试用组织
  - 最小名单 + 角色划分 + 反馈问题集
## 4. 可以随后再做

这些是后续值得做，但不该阻塞 MVP。

### 4.1 完整 LLM 平台化

- [ ] 真正落地 `Task Facade + Model Router + Provider Adapters`
- [ ] 扩展到：
  - `copilot`
  - `report`
  - 更细粒度任务类型

### 4.2 更细的领域拆分

- [ ] 视 Journey 2 和更多输出模式推进情况，再决定是否拆：
  - `workflow-engine`
  - `report-builder`
  - 专家审稿逻辑
- [ ] 当前不要为了“看起来更优雅”先拆

### 4.3 更重的平台能力

- [ ] 登录 / 权限
- [ ] 多人协作
- [ ] 审批流
- [ ] 知识库 / RAG
- [ ] 队列 / 异步编排
- [ ] 微服务化

## 5. 不在当前 MVP 范围

- 不做多租户
- 不做复杂组织权限
- 不做独立 prompt 管理后台
- 不做自建模型平台
- 不做为了解决未来问题而提前引入的基础设施

## 6. 建议推进顺序

```text
Now
  -> 部署边界写死
  -> LLM 接口边界写死
  -> mockup 回灌账本建立
  -> 运行态污染规则固化

Before external MVP
  -> 浏览器 smoke
  -> 错误路径可观测性
  -> Postgres 预览部署验证
  -> workspace 最小拆分

Later
  -> 完整 LLM 平台化
  -> 进一步领域拆分
  -> 登录 / 协作 / 知识库等平台能力
```

## 7. 一句话执行原则

当前阶段的正确策略不是“重做架构”，而是：

**保持单体、保持显式、保持测试护栏，在不扩大系统复杂度的前提下把 MVP 从 demo 推到可外部试用。**
