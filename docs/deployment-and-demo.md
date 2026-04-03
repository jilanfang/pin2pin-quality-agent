# Pin2pin Fireline 运行与部署说明

本文档描述当前 `Pin2pin Fireline` 的实际技术形态、运行方式和部署路径。当前权威实现是 `Next.js App Router + TypeScript` 单项目；根目录 `index.html` 仍保留为可运行的离线原型 / 演示参考线，但不是上线目标架构。

## 1. 当前实现状态

- 前端与 API 在同一个 Next.js 项目中。
- 首页工作台入口：`/`
- API 路由已具备完整演示闭环：
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
npm start
npm run smoke:browser
```

- `npm run smoke:browser` 会用真实浏览器跑最小主链路：
  - 打开首页
  - 新建空白案件
  - 输入一条证据
  - 打开报告预览
- 这条冒烟验证还会额外检查：
  - `/_next/static` 返回正常
  - 页面无控制台报错
  - 关键接口没有 `4xx/5xx`

## 3. 数据存储模式

当前代码里仍保留两种存储路径，但它们的用途已经不同。

### 模式 A：本地文件存储（无数据库）

只适合本机调试、临时自测、没有账号体系要求的离线演示。

- 不设置 `DATABASE_URL`
- 案件数据保存在本地文件
- 默认路径是 `AI_QUALITY_STORE_PATH`，未设置时回落到 `/tmp/ai-quality-demo-store.json`
- 同一台机器上重启服务后可继续读到之前的案件
- 不适合任何外部试用、Vercel 预览部署或 `serverless` 场景，因为实例切换后本地文件不可靠
- 不支持当前正式的“手工发账号密码 + 登录后进入工作台”产品路径
- `/tmp/ai-quality-demo-store.json` 只用于本机临时演示，不应被描述成对外试用方案

`.env.example` 当前内容：

```env
DATABASE_URL=
```

### 模式 B：Postgres + 本地账号密码认证

这是当前正式产品路径，也是 Vercel 预览、生产、外部邀测的必选模式。

- 设置 `DATABASE_URL`
- 应用切换到 Postgres store，并启用正式账号密码登录链路
- 外部试用 / 预览部署必须使用 Postgres，不再允许以本地文件模式对外演示
- 当前已验证可用的是 `Supabase Postgres + Vercel`

通用格式示例：

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

本项目当前已验证的 Supabase pooler 格式是：

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require
```

关键规则：

- 不要在 Vercel 上想当然地使用 `db.<project-ref>.supabase.co`
- 这个项目的真实故障就是生产环境使用了错误主机，最终报 `Failed query: select ... from users ...`
- 实际根因不是 SQL 或登录逻辑，而是运行时连不上数据库主机
- 对已经 `supabase link` 的项目，本地第一信源是 `supabase/.temp/pooler-url`
- 先从 `supabase/.temp/pooler-url` 取出 host，再补上密码和 `?sslmode=require`

如果首次接数据库，需要执行：

```bash
npm run db:push
```

## 4. 最小环境变量清单

对外预览 / 试用至少准备：

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
AI_QUALITY_LLM_ENABLED=false
```

说明：

- 现在 `DATABASE_URL` 不只是数据存储开关，也是正式认证链路前提
- 没有数据库时，不能再把项目描述成“可正常登录的完整产品”

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

### 当前生产基线清单

当前 `fireline.pin2pin.ai` 已验证跑通的正式环境变量基线如下。

必需项：

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
AI_QUALITY_LLM_ENABLED=true
AI_QUALITY_LLM_API_KEY=your_api_key
AI_QUALITY_LLM_BASE_URL=https://your-llm-gateway-or-provider/v1
AI_QUALITY_LLM_PROVIDER=your_provider
AI_QUALITY_LLM_TIMEOUT_MS=30000
```

模型路由项：

```env
AI_QUALITY_LLM_CONVERSATION_PRIMARY_PROVIDER=
AI_QUALITY_LLM_CONVERSATION_PRIMARY_MODEL=
AI_QUALITY_LLM_CONVERSATION_FALLBACK_PROVIDER=
AI_QUALITY_LLM_CONVERSATION_FALLBACK_MODEL=
AI_QUALITY_LLM_CONVERSATION_TIMEOUT_MS=

AI_QUALITY_LLM_COPILOT_PRIMARY_PROVIDER=
AI_QUALITY_LLM_COPILOT_PRIMARY_MODEL=
AI_QUALITY_LLM_COPILOT_FALLBACK_PROVIDER=
AI_QUALITY_LLM_COPILOT_FALLBACK_MODEL=
AI_QUALITY_LLM_COPILOT_TIMEOUT_MS=

AI_QUALITY_LLM_EXTRACT_PRIMARY_PROVIDER=
AI_QUALITY_LLM_EXTRACT_PRIMARY_MODEL=
AI_QUALITY_LLM_EXTRACT_FALLBACK_PROVIDER=
AI_QUALITY_LLM_EXTRACT_FALLBACK_MODEL=
AI_QUALITY_LLM_EXTRACT_TIMEOUT_MS=

AI_QUALITY_LLM_REPORT_PRIMARY_PROVIDER=
AI_QUALITY_LLM_REPORT_PRIMARY_MODEL=
AI_QUALITY_LLM_REPORT_FALLBACK_PROVIDER=
AI_QUALITY_LLM_REPORT_FALLBACK_MODEL=
AI_QUALITY_LLM_REPORT_TIMEOUT_MS=
```

说明：

- 这套键需要同时存在于 `Production / Preview / Development`
- 平台自动注入的 `VERCEL_*`、`TURBO_*`、`NX_DAEMON` 不属于业务配置，不要求和本地 `.env.local` 一致
- `VERCEL_OIDC_TOKEN` 属于运行时签发值，不要求和本地一致
- `vercel env pull` 不能单独作为敏感变量是否为空的证据；敏感值可能在拉下来的文件里显示为空字符串，但 `vercel env ls <env>` 仍会显示该键已存在

### 本地与线上一致性检查

推荐把“本地 `.env.local` 是否和 Vercel 三套环境对齐”做成固定检查动作。

先确认当前项目绑定正确：

```bash
cat .vercel/project.json
vercel whoami
```

再看线上三套环境是否都具备完整键集合：

```bash
vercel env ls production
vercel env ls preview
vercel env ls development
```

如果要把线上环境拉到临时文件做键名比对：

```bash
vercel env pull /tmp/ai-quality-prod-env --environment=production
vercel env pull /tmp/ai-quality-preview-env --environment=preview
vercel env pull /tmp/ai-quality-dev-env --environment=development
```

对账原则：

- 先比“键是否存在”，再比“运行结果是否正常”
- 对敏感值，不要求在命令行里看明文；优先确认：
  - 键已存在
  - 生产 smoke 跑通
  - `GET /api/health` 正常
  - 登录、建案、进入调查链路正常
- 如果 `Production / Preview / Development` 的键集合不一致，先补齐再部署
- 如果本地和线上都存在相同键，但线上运行异常，不要先怀疑 SQL 或前端，先怀疑：
  - 数据库 host 写错
  - 平台环境没有同步到目标环境
  - 当前 Vercel 项目绑定错了

## 5. 推荐部署路径：Vercel

当前目标是“单仓库、单体系、完整前后端 + API、可直接打开演示”，所以推荐 Vercel，而不是 GitHub Pages。

### 最简部署步骤

1. 把当前仓库连接到 Vercel
2. Framework Preset 选择 `Next.js`
3. 在 Vercel 项目环境变量中配置 `DATABASE_URL`
4. 首次建库后执行一次 `npm run db:push`
5. 触发部署

### Supabase + Vercel 的已验证做法

这部分是这次线上事故后沉淀出来的标准做法。

1. 先确认 Supabase 项目已经 link 成功。
2. 优先读取 `supabase/.temp/pooler-url`，不要先手写数据库 host。
3. 按下面的形式组装最终 `DATABASE_URL`：

```env
postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require
```

4. 用非交互方式写入 Vercel 环境变量，避免 CLI 交互态输错、漏环境、或值被截断：

```bash
printf '%s' "$DATABASE_URL" | vercel env add DATABASE_URL production --sensitive --force
printf '%s' "$DATABASE_URL" | vercel env add DATABASE_URL preview --sensitive --force
printf '%s' "$DATABASE_URL" | vercel env add DATABASE_URL development --force
```

5. 再执行正式部署。

### 这次部署事故的结论

- `vercel env pull` 不能作为敏感变量是否为空的证据。它可能把敏感值拉成空字符串展示。
- 本机网络代理或 DNS 劫持会让 `dig`、`nslookup` 结果失真，这台机器上出现过 `198.18.x.x` 之类结果，不能据此判断公网 DNS 真正状态。
- 对生产问题，优先做真实端到端验证，不要被本机 DNS 现象带偏。
- 这次真正有效的验证不是“本机能不能解析某个 host”，而是：
  - 生产登录接口是否返回 `200`
  - 是否成功下发 `HttpOnly` session cookie
  - 带 cookie 访问首页是否 `200`
  - 未登录访问业务 API 是否返回 `401` JSON
  - `GET /api/health` 是否正常

### 本地联调注意事项

- 保持 `npm run dev` 使用 polling，不要随手改脚本
- 不要在同一个工作目录里同时运行 `next dev` 和 `next start`
- 两者会共用 `.next` 目录，开发产物可能覆盖生产产物，导致生产页静态资源 404
- 当前仓库已把开发构建目录切到 `.next-dev`，避免本地 `dev` 把 `.next` 里的生产产物和静态资源索引踩坏
- 如果你看到页面能打开但样式明显退回浏览器默认值，例如 `body` 出现默认 `8px` margin、登录页输入框变成系统默认样式，优先检查 `/_next/static/css/...` 是否 404，以及当前是不是误用了损坏的 `.next` 目录
- 当前全局端口约定下，这个项目默认使用 `127.0.0.1:3001`
- 正确做法是：
  - 开发调试时只运行 `npm run dev`
  - 生产验证时执行 `npm run build && npm start`
  - 如果必须并行验证，使用独立工作目录或单独的 `distDir`
  - 同项目多实例时，继续在 `3002-3009` 内顺延，不要切去别的项目端口块

### 推荐演示配置

- 预览 / 演示环境：使用 Supabase 或 Neon 的 Postgres
- 登录方式：本地用户名密码认证，不做前端注册
- 建号方式：后台脚本手工发测试账号密码
- 演示路径：登录后进入首页与工作台，再用种子案例或真实碎片输入演示完整链路

### 生产验证清单

上线前至少完成一次真实环境验证：

1. 用后台发出的真实测试账号执行登录。
2. 确认响应返回 `200`，并且浏览器拿到 session cookie。
3. 登录后访问首页，确认返回 `200`。
4. 未登录访问业务 API，例如 `GET /api/cases`，确认返回 `401` JSON，而不是 HTML 重定向页。
5. 已登录访问 `GET /api/cases`，确认接口正常返回。
6. `GET /api/health` 返回 `{"status":"ok"}`。

## 6. LLM 接入边界

- 后续所有在线模型调用只能经由 [`lib/server/llm.ts`](/Users/jilanfang/ai-quality/lib/server/llm.ts)
- 不要在以下位置直接写服务接入 / 模型 / 接口地址逻辑：
  - `lib/domain/workflow-engine.ts`
  - `lib/domain/guided-thinking.ts`
  - `lib/domain/report-builder.ts`
  - `components/workspace.tsx`
- 当前已具备服务方 / 能力 / 回退路由，但默认只把这层能力接在 `extract` 上
- `copilot` / `report` 如果后续要接在线模型，先扩 `lib/server/llm.ts` 的统一入口与路由层，再落具体能力

## 7. 演示环境当前能力

### 已具备

- 用户名 + 密码登录
- 后台脚本手工创建 / 禁用 / 改密测试账号
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

- 前端注册
- 邮箱验证码 / 邮件找回
- 后台用户管理界面
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
- 生产数据库配置对 host 形式敏感，Vercel 上不要盲信 Supabase 直连 host，先核对 pooler URL。
- 旧目录 `backend/` 仍保留作迁移参考，不是当前上线主链路。
- 根目录 `index.html` 仍可运行，适合作离线演示、交互试验和报告展示对照，但不应替代当前产品主线。

## 9. 建议的下一步

按演示上线优先级，建议顺序如下：

1. 先继续把 `lib/server/llm.ts` 这层统一入口与路由层用到更多能力，再决定是否给 `copilot` / `report` 接真实服务方。
2. 增加 benchmark case 的 API/页面级回归测试。
3. 把本地账号管理脚本再补一层最小运维说明。
4. 优化正式报告页面，补 `打印为 PDF` 的演示路径。
5. 再考虑案例库、经验库、协作权限等平台能力。

## 10. 相关文档

- [文档索引](./README.md)
- [MVP 加固清单](./mvp-hardening-checklist.md)
- [迁移账本](./index-html-to-nextjs-migration-ledger.md)
- [当前交接说明](./current-handoff.md)
  只用于线程恢复，不作为长期 source of truth
- [`../AGENTS.md`](/Users/jilanfang/ai-quality/AGENTS.md)
