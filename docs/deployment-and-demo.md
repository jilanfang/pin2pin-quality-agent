# 芯科元析工作台运行与部署说明

本文档描述当前 `芯科元析失效分析工作台` 的实际技术形态、运行方式和部署路径。当前权威实现是 `Next.js App Router + TypeScript` 单项目；根目录 `index.html` 仍保留为可运行的离线 mockup / demo 参考线，但不是上线目标架构。

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

说明：

- 当前开发脚本已固定为 `WATCHPACK_POLLING=true next dev --hostname 127.0.0.1 --port 3001`
- 在这台机器上不要随手改回裸 `next dev`
- 默认开发端口是 `127.0.0.1:3001`

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

只适合本机 demo、自测、无数据库时快速启动。

- 不设置 `DATABASE_URL`
- 案件数据保存在本地文件
- 默认路径是 `AI_QUALITY_STORE_PATH`，未设置时回落到 `/tmp/ai-quality-demo-store.json`
- 同一台机器上重启服务后可继续读到之前的案件
- 不适合任何外部试用、Vercel 预览部署或 serverless demo，因为实例切换后本地文件不可靠
- `/tmp/ai-quality-demo-store.json` 只用于本机临时 demo，不应被描述成对外试用方案

`.env.example` 当前内容：

```env
DATABASE_URL=
```

### 模式 B：Postgres

适合 Vercel 预览、外部试用、多人试用、需要跨重启保留数据的环境。

- 设置 `DATABASE_URL`
- 应用自动切换到 Postgres store
- 推荐接 Neon 或 Supabase
- 外部试用 / 预览部署必须使用 Postgres，不再允许以本地文件模式对外演示

示例：

```env
DATABASE_URL=postgres://user:password@host:5432/dbname
```

如果首次接数据库，需要执行：

```bash
npm run db:push
```

## 4. 最小环境变量清单

对外预览 / 试用至少准备：

```env
DATABASE_URL=postgres://user:password@host:5432/dbname
AI_QUALITY_LLM_ENABLED=false
```

可选的在线模型配置统一使用 `AI_QUALITY_LLM_*`：

```env
AI_QUALITY_LLM_ENABLED=true
AI_QUALITY_LLM_BASE_URL=https://api.vectorengine.ai/v1
AI_QUALITY_LLM_API_KEY=your_api_key
AI_QUALITY_LLM_EXTRACT_PRIMARY_PROVIDER=deepseek
AI_QUALITY_LLM_EXTRACT_PRIMARY_MODEL=deepseek-v3.2
AI_QUALITY_LLM_EXTRACT_FALLBACK_PROVIDER=ark
AI_QUALITY_LLM_EXTRACT_FALLBACK_MODEL=ark-code-latest
```

当前默认只要求把 `extract` 能力配通；`copilot` / `report` 仍可继续走规则主链路。

## 5. 推荐部署路径：Vercel

当前目标是“单仓库、单体系、完整前后端 + API、可直接打开演示”，所以推荐 Vercel，而不是 GitHub Pages。

### 最简部署步骤

1. 把当前仓库连接到 Vercel
2. Framework Preset 选择 `Next.js`
3. 在 Vercel 项目环境变量中配置 `DATABASE_URL`
4. 首次建库后执行一次 `npm run db:push`
5. 触发部署

### 本地联调注意事项

- 保持 `npm run dev` 使用 polling，不要随手改脚本
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

## 6. LLM 接入边界

- 后续所有在线模型调用只能经由 [`lib/server/llm.ts`](/Users/jilanfang/ai-quality/lib/server/llm.ts)
- 不要在以下位置直接写 provider / model / endpoint 逻辑：
  - `lib/domain/workflow-engine.ts`
  - `lib/domain/guided-thinking.ts`
  - `lib/domain/report-builder.ts`
  - `components/workspace.tsx`
- 当前已具备 provider / capability / fallback 路由，但默认只把这层能力接在 `extract` 上
- `copilot` / `report` 如果后续要接在线模型，先扩 `lib/server/llm.ts` 的 facade / router，再落具体能力

## 7. Demo 当前能力

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

## 8. 当前已知限制

- 当前在线模型路由主要接在 `extract`，`copilot` / `report` 仍默认以规则和模板为主。
- PDF 仍建议先用浏览器打印正式 HTML。
- Postgres schema 当前通过 `drizzle-kit push` 直接同步，尚未沉淀正式 migration 流程。
- 旧目录 `backend/` 仍保留作迁移参考，不是当前上线主链路。
- 根目录 `index.html` 仍可运行，适合作离线 demo、交互试验和报告展示对照，但不应替代当前产品主线。

## 9. 建议的下一步

按 demo 上线优先级，建议顺序如下：

1. 先继续把 `lib/server/llm.ts` 这层 facade / router 用到更多能力，再决定是否给 `copilot` / `report` 接真实 provider。
2. 增加 benchmark case 的 API/页面级回归测试。
3. 接通真实 Postgres 并完成一次 Vercel 预览部署。
4. 优化正式报告页面，补 `打印为 PDF` 的演示路径。
5. 再考虑登录、案例库、经验库、暗知识沉淀。

## 10. 相关文档

- [MVP Hardening Checklist](./mvp-hardening-checklist.md)
- [Mockup Migration Ledger](./index-html-to-nextjs-migration-ledger.md)
- [Current Handoff](./current-handoff.md)
- [`../AGENTS.md`](/Users/jilanfang/ai-quality/AGENTS.md)
