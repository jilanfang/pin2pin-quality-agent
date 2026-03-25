# 8D Demo 运行与部署说明

本文档描述当前 `8D Copilot` demo 的实际技术形态、运行方式和部署路径。当前权威实现是 `Next.js App Router + TypeScript` 单项目；根目录 `index.html` 仍保留为可运行的离线 mockup / demo 参考线，但不是上线目标架构。

## 1. 当前实现状态

- 前端与 API 在同一个 Next.js 项目中。
- 首页工作台入口：`/`
- API 路由已具备完整 demo 闭环：
  - `GET /api/health`
  - `GET /api/cases`
  - `POST /api/cases`
  - `GET /api/cases/:id`
  - `POST /api/cases/:id/evidence`
  - `POST /api/cases/:id/stages/:stage/confirm`
  - `POST /api/cases/:id/stages/:stage/unlock`
  - `POST /api/cases/:id/stages/:stage/revalidate`
  - `GET /api/cases/:id/report-preview`
  - `GET /api/cases/:id/report-html`
  - `POST /api/cases/:id/report`
- 业务逻辑已迁移到 TypeScript 领域层：
  - `workflow-engine`：阶段推进、确认、解锁、复审
  - `extractor`：从零碎输入抽取事实、缺口、假设、风险
  - `report-builder`：生成 `24h 初版 / interim / final`
  - `seed-cases`：演示案例数据

## 2. 本地运行

### 环境要求

- Node.js 20+
- npm 10+

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

默认访问：

- 页面：[http://localhost:3001](http://localhost:3001)
- 健康检查：[http://localhost:3001/api/health](http://localhost:3001/api/health)

### 本地验证

```bash
npm test
npm run build
```

## 3. 数据存储模式

当前支持两种模式。

### 模式 A：本地文件存储（无数据库）

适合本地 demo、临时演示、无数据库时快速启动。

- 不设置 `DATABASE_URL`
- 案件数据保存在本地文件
- 默认路径是 `AI_QUALITY_STORE_PATH`，未设置时回落到 `/tmp/ai-quality-demo-store.json`
- 同一台机器上重启服务后可继续读到之前的案件
- 不适合 Vercel 等 serverless 正式演示环境，因为实例切换后本地文件不可靠

`.env.example` 当前内容：

```env
DATABASE_URL=
```

### 模式 B：Postgres

适合 Vercel demo、多人试用、需要跨重启保留数据的环境。

- 设置 `DATABASE_URL`
- 应用自动切换到 Postgres store
- 推荐接 Neon 或 Supabase

示例：

```env
DATABASE_URL=postgres://user:password@host:5432/dbname
```

如果首次接数据库，需要执行：

```bash
npm run db:push
```

## 4. 推荐部署路径：Vercel

当前目标是“单仓库、单体系、完整前后端 + API、可直接打开演示”，所以推荐 Vercel，而不是 GitHub Pages。

### 最简部署步骤

1. 把当前仓库连接到 Vercel
2. Framework Preset 选择 `Next.js`
3. 在 Vercel 项目环境变量中配置 `DATABASE_URL`
4. 首次建库后执行一次 `npm run db:push`
5. 触发部署

### 如果暂时没有数据库

也可以直接部署：

- 不设置 `DATABASE_URL`
- 服务会退回本地文件模式
- 适合单人短时演示
- 不适合正式对外测试，因为 serverless 实例切换后数据无法保证保留

### 本地联调注意事项

- 不要在同一个工作目录里同时运行 `next dev` 和 `next start`
- 两者会共用 `.next` 目录，开发产物可能覆盖生产产物，导致生产页静态资源 404
- 当前全局端口约定下，这个项目默认使用 `127.0.0.1:3001`
- 正确做法是：
  - 开发调试时只运行 `npm run dev`
  - 生产验证时执行 `npm run build && npm start`
  - 如果必须并行验证，使用独立工作目录或单独的 `distDir`
  - 同项目多实例时，继续在 `3002-3009` 内顺延，不要切去别的项目端口块

### 推荐演示配置

- Preview / Demo 环境：使用 Neon 或 Supabase 的 Postgres
- 生产前阶段先不开登录、不做多租户
- 用种子案例直接展示完整路径，再补真实碎片输入

## 5. Demo 当前能力

### 已具备

- 新建空白案件
- 一键载入种子案例
- 通过对话式输入补充零碎证据
- 阶段确认、解锁、复审
- 生成 `24h 初版 / interim / final` 预览
- 输出 `文本` 与 `正式 HTML 报告`
- 显式执行 `生成 Final 并结案`
- `final` 出稿门槛校验
- 可选文风：
  - `专业克制`
  - `对客正式`
  - `内部直给`

### 现阶段刻意不做

- 用户登录
- 团队协作权限
- 多租户
- 多模板报告商城
- 复杂 PDF 引擎
- 真正的 LLM 在线推理
- 与 MES / ERP / QMS 集成

## 6. 当前已知限制

- 未接入真实 LLM provider，当前抽取与阶段草稿仍以规则和模板为主。
- 尚未实现 `多模型 / 多供应商` 的 LLM adapter 层。
- PDF 仍建议先用浏览器打印正式 HTML。
- Postgres schema 当前通过 `drizzle-kit push` 直接同步，尚未沉淀正式 migration 流程。
- 旧目录 `backend/` 仍保留作迁移参考，不是当前上线主链路。
- 根目录 `index.html` 仍可运行，适合作离线 demo、交互试验和报告展示对照，但不应替代当前产品主线。

## 7. 建议的下一步

按 demo 上线优先级，建议顺序如下：

1. 先按 `docs/llm-usage-strategy.md` 设计 `LLM Task Facade + Model Router + Provider Adapters`，再接入真实 LLM provider；默认让所有用户输入先经过低成本模型抽取，再用规则校验与归一化。
2. 增加 benchmark case 的 API/页面级回归测试。
3. 接通真实 Postgres 并完成一次 Vercel 预览部署。
4. 优化正式报告页面，补 `打印为 PDF` 的演示路径。
5. 再考虑登录、案例库、经验库、暗知识沉淀。

## 8. 相关文档

- [技术评估](./tech-evaluation.md)
- [LLM 使用策略](./llm-usage-strategy.md)
- [8D 输出格式与文风设计](./output-format-design.md)
- [8D 输出层契约与渲染规则](./output-layer-contract.md)
- [8D 出稿门槛与版本规则](./report-readiness-rules.md)
- [8D 工具上市准备检查](./launch-readiness.md)
