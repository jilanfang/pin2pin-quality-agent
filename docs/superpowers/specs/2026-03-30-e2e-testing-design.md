# E2E Testing Design: Real LLM + Real Database

## Context

当前测试套件（166 个用例）全部禁用 LLM 调用（`AI_QUALITY_LLM_ENABLED=false`），数据库用临时 JSON 文件。17 个用户旅程场景只走规则基线路径。没有任何测试验证真实 LLM 返回结构和内容，也没有测试验证 Postgres 持久化链路。

本设计新增分层 E2E 测试：API 集成测试 + 浏览器全栈测试，打通 LLM 和 Postgres 两个关键缺口。

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Layer 1: API Integration E2E (Vitest)               │
│  tests/e2e/*.e2e.test.ts                             │
│  直接调用 postEvidenceHandler / askCopilotWithLlm    │
│  ↓ 真实 LLM 调用   ↓ 真实 Postgres 读写             │
├──────────────────────────────────────────────────────┤
│  Layer 2: Browser E2E (Playwright)                   │
│  tests/e2e-browser/*.spec.ts                         │
│  浏览器 → Next.js → API → LLM → Postgres            │
│  完整 UI 链路验证                                     │
└──────────────────────────────────────────────────────┘
         ↓                           ↓
   Docker Compose              .env real keys
   Postgres 16 (port 5433)     DASHSCOPE / DeepSeek / Ark
```

## Infrastructure

### Docker Compose (`docker-compose.test.yml`)

- 镜像: `postgres:16-alpine`
- 端口: `5433:5432` (避开本地 5432)
- 数据库: `ai_quality_test`
- 用户/密码: `test_user` / `test_pass`
- 连接串: `postgres://test_user:test_pass@localhost:5433/ai_quality_test`
- 需要 Docker Compose v2（`docker compose` 插件，非 legacy `docker-compose`）

### LLM Configuration

- 直接读取当前 `.env` 中已配置的真实 API key
- 测试启动时检查必要的 key 是否存在，缺失则跳过全部 E2E 并输出清晰提示
- E2E setup 必须显式设置 `AI_QUALITY_LLM_ENABLED=true`（区别于单元测试的 `false` 约定）
- 超时配置:
  - `AI_QUALITY_LLM_CONVERSATION_TIMEOUT_MS=20000`（conversation 能力）
  - `AI_QUALITY_LLM_COPILOT_TIMEOUT_MS=20000`（copilot 能力）
- 不创建单独的 `.env.test`，使用 `.env` + 环境变量覆盖 `DATABASE_URL`

### Schema Setup

- Schema push 必须通过 shell 环境变量注入 `DATABASE_URL`，确保 drizzle.config.ts 不会回退到默认的 localhost:5432:
  ```bash
  DATABASE_URL=postgres://test_user:test_pass@localhost:5433/ai_quality_test npm run db:push
  ```
- 每个测试文件 `beforeAll` 验证连接可用
- 每个测试文件 `beforeEach` 执行 `TRUNCATE ... CASCADE` 清空所有测试表，保证测试间完全隔离（不依赖 `afterEach` 逐条清理，避免测试中途失败导致残留数据）

### Database Connection Singleton 处理

`lib/db/client.ts` 中的 `getDb()` 将连接缓存到 `globalThis.__aiQualitySql`。E2E 测试必须使用与现有测试相同的 `vi.resetModules()` + 动态 import 模式，确保每个测试文件在正确的 `DATABASE_URL` 下重新初始化连接:

```typescript
// 每个 E2E 测试文件的 beforeAll
process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.AI_QUALITY_LLM_ENABLED = "true";
vi.resetModules();
const { postEvidenceHandler } = await import("@/lib/server/api");
const { getCaseStore } = await import("@/lib/server/case-store");
```

## Layer 1: API Integration E2E

### 文件结构

```
tests/e2e/
├── e2e-setup.ts              # Docker lifecycle + DB schema + LLM key 检查
├── e2e-helpers.ts            # 共享工具: 创建 case、清理数据、内容断言
├── evidence-llm.e2e.test.ts  # 证据提交 + LLM 分析
├── copilot-llm.e2e.test.ts   # Copilot 问答
└── full-journey.e2e.test.ts  # 完整用户旅程
```

### Vitest 配置 (`vitest.e2e.config.ts`)

```typescript
{
  test: {
    include: ["tests/e2e/**/*.e2e.test.ts"],
    testTimeout: 30_000,         // LLM 调用可能需要 5-15 秒
    retry: 2,                    // LLM 调用存在不确定性，允许重试
    maxWorkers: 1,               // 串行，避免 DB 竞争
    globalSetup: ["tests/e2e/e2e-setup.ts"],
    setupFiles: [],              // 不需要 jsdom
    environment: "node",         // Node 环境
  }
}
```

同时，主 `vitest.config.ts` 需要排除 E2E 文件，防止 `npm test` 误跑:
```typescript
exclude: ["tests/e2e/**", "tests/e2e-browser/**"]
```

### e2e-setup.ts

职责:
1. **前置检查**: 验证 Docker Compose v2 可用，LLM API key 存在
2. **Docker Postgres lifecycle**: `docker compose -f docker-compose.test.yml up -d --wait`
3. **Schema push**: `DATABASE_URL=<test_url> npm run db:push`（通过 shell 环境变量，不是 Node process.env）
4. **LLM provider 健康检查**: 发一个极简 prompt 验证 LLM 可达，不可达则跳过整个 suite 并输出清晰提示
5. **teardown**: `docker compose -f docker-compose.test.yml down -v`

### e2e-helpers.ts

```typescript
export const E2E_DATABASE_URL = "postgres://test_user:test_pass@localhost:5433/ai_quality_test";

export function getTestDatabaseUrl(): string;

// 通过 getCaseStore()（自动使用 PostgresCaseStore，因为 DATABASE_URL 已设置）
export async function createTestCase(title: string): Promise<CaseAggregate>;

// TRUNCATE 所有测试相关表
export async function truncateAllTables(): Promise<void>;

// 严格内容断言工具
export function assertFactExtracted(
  facts: FactItem[], field: string, expectedValuePattern: string | RegExp
): void;
export function assertChineseText(text: string, minLength?: number): void;
```

### evidence-llm.e2e.test.ts

**测试用例**:

1. **客诉邮件提取** — 提交一封包含客户名、型号、失效位置的客诉邮件
   - 断言: `knownFacts` 包含 `customer` 字段（值匹配输入中的客户名）
   - 断言: `knownFacts` 包含 `model` 或 `failure_location` 字段
   - 断言: `intents` 包含 `"evidence"`
   - 断言: `sourceShape` = `"long_document"`
   - 断言: `caseOperation` = `"attach_to_current_case"`
   - 断言: `assistantReplyDraft` 是中文，长度 > 10
   - 断言: 从 Postgres 重新读取 case，`messages` 和 `knownFacts` 持久化正确

2. **碎片化更新提取** — 提交一条简短的即时消息风格的更新
   - 断言: `sourceShape` = `"fragmented_update"` 或 `"mixed_input"`
   - 断言: `responseMode` = `"guide"`

3. **纠偏意图检测** — 提交一条"之前的判断不对，实际上是..."的纠偏
   - 断言: `intents` 包含 `"correction"`
   - 断言: `thinking.mode` = `"reviewing_prior_judgement"`

4. **摘要请求** — 提交"目前情况总结一下"
   - 断言: `summaryRequested` = `true`
   - 断言: 返回的 messages 中包含摘要内容

5. **歧义 case 确认** — 提交与当前调查不相关的内容
   - 断言: `caseOperation` = `"needs_case_confirmation"`
   - 断言: case 状态未被修改（fail-closed）

### copilot-llm.e2e.test.ts

**测试用例**:

1. **8D 方法论问答** — 提问"D4 阶段应该怎么做根因分析"
   - 断言: 返回中文回答
   - 断言: 内容提及 "根因" 或 "root cause" 或 "5Why" 或 "鱼骨图" 等关键词
   - 断言: 长度 > 50 字

2. **质量工具问答** — 提问"FMEA 怎么评估严重度"
   - 断言: 返回中文回答
   - 断言: 包含 FMEA 相关术语

### full-journey.e2e.test.ts

**测试用例** (1 个完整旅程):

建案 → 提交客诉邮件证据 → 验证 LLM 分析结果 → 提交纠偏 → 验证 impact → 请求摘要 → 确认 D2 阶段 → 生成分析预览报告

每一步都验证:
- API 返回的数据结构正确
- Postgres 持久化后重新读取一致
- LLM 分析的字段内容合理

## Layer 2: Browser E2E

### 文件结构

```
tests/e2e-browser/
├── playwright.config.ts       # Playwright 配置 + Next.js webServer
├── global-setup.ts            # Docker Postgres 启动 + schema
├── global-teardown.ts         # Docker Postgres 清理
└── investigation.spec.ts      # 完整调查工作流
```

### Playwright 配置

使用端口 3099（避免与开发服务器 3001 冲突，防止 `reuseExistingServer` 复用连接到错误数据库的 dev 实例）:

```typescript
{
  testDir: ".",
  timeout: 60_000,
  retries: 1,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3099" },
  webServer: {
    command: [
      "DATABASE_URL=postgres://test_user:test_pass@localhost:5433/ai_quality_test",
      "AI_QUALITY_LLM_ENABLED=true",
      "AI_QUALITY_LLM_CONVERSATION_TIMEOUT_MS=20000",
      "AI_QUALITY_LLM_COPILOT_TIMEOUT_MS=20000",
      "WATCHPACK_POLLING=true",
      "next dev --hostname 127.0.0.1 --port 3099",
    ].join(" "),
    url: "http://127.0.0.1:3099/api/health",
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  }
}
```

注: Next.js dev 模式会自动加载 `.env` 文件，因此 LLM provider API key（如 `DASHSCOPE_API_KEY`）不需要在此重复设置。

### Playwright 浏览器安装

首次使用前需要安装浏览器:
```bash
npx playwright install chromium
```

### investigation.spec.ts

**测试用例**: 完整调查工作流

1. 打开首页，点击"新建调查"
2. 输入标题，创建 case
3. 在 composer 中输入客诉邮件内容
4. 发送，等待 LLM 返回（`page.waitForResponse('**/evidence')`, timeout 30s）
5. 验证: 消息列表中出现 assistant 回复
6. 验证: 事实面板中出现提取的 knownFacts
7. 点击"分析预览"
8. 验证: 预览页面正确渲染

## npm Scripts

```json
{
  "test:e2e:setup": "docker compose -f docker-compose.test.yml up -d --wait && DATABASE_URL=postgres://test_user:test_pass@localhost:5433/ai_quality_test npm run db:push",
  "test:e2e:teardown": "docker compose -f docker-compose.test.yml down -v",
  "test:e2e": "vitest run --config vitest.e2e.config.ts",
  "test:e2e:browser": "npx playwright test --config tests/e2e-browser/playwright.config.ts"
}
```

正常运行流程:
```bash
npm run test:e2e:setup           # 启动 Docker Postgres + schema push
npm run test:e2e                  # API 集成测试
npm run test:e2e:browser          # 浏览器 E2E (自动启动 Next.js on :3099)
npm run test:e2e:teardown         # 清理
```

## Assertion Strategy (严格内容断言)

LLM 输出有不确定性，但对于结构化输入（客诉邮件包含明确的客户名、型号等），LLM 应当稳定提取这些关键信息。断言规则:

1. **枚举字段**: `intents`, `sourceShape`, `caseOperation`, `responseMode` — 精确匹配
2. **事实字段**: `knownFacts` 中的 `customer`, `model` 等 — 验证 field 存在且 value 包含输入中的关键词
3. **文本字段**: `assistantReplyDraft`, copilot 回答 — 验证是中文、长度合理、包含领域关键词
4. **结构字段**: `thinking.steps` 非空数组, `confidence` 在 0-1 范围内
5. **持久化一致性**: Postgres 写入后重新读取，验证关键字段一致

**不稳定性缓解**:
- Vitest E2E 配置 `retry: 2`，每个用例最多重试 2 次
- Playwright 配置 `retries: 1`
- 对于语义级别的文本断言（如"回答包含 5Why"），使用 `expect.soft()` 标记为 soft assertion
- 枚举字段和结构字段使用 hard assertion
- E2E global setup 先发一个极简 LLM 健康检查 prompt，不可达则跳过全 suite

## CI Integration

**当前阶段**: E2E 测试仅在本地手动触发，不加入 CI pipeline。

原因:
- 需要 Docker、真实 LLM API key，CI runner 需要相应配置
- LLM 调用有费用，每次运行预计消耗 ~0.01-0.05 元
- 需要先在本地验证稳定性后再考虑 CI 集成

**后续 CI 集成方案**（本次不实现）:
- API key 通过 CI secrets 注入
- 仅在手动触发或定时调度（如每日凌晨）时运行，不在每个 PR 上运行
- Docker Compose 启动 Postgres（CI runner 需支持 Docker）
- 测试结果和 Playwright report 作为 CI artifacts 上传

## New Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.52.0"
  }
}
```

安装后需执行: `npx playwright install chromium`

## Files to Create/Modify

**新建**:
- `docker-compose.test.yml`
- `vitest.e2e.config.ts`
- `tests/e2e/e2e-setup.ts`
- `tests/e2e/e2e-helpers.ts`
- `tests/e2e/evidence-llm.e2e.test.ts`
- `tests/e2e/copilot-llm.e2e.test.ts`
- `tests/e2e/full-journey.e2e.test.ts`
- `tests/e2e-browser/playwright.config.ts`
- `tests/e2e-browser/global-setup.ts`
- `tests/e2e-browser/global-teardown.ts`
- `tests/e2e-browser/investigation.spec.ts`

**修改**:
- `package.json` — 添加 scripts 和 devDependency
- `vitest.config.ts` — 添加 `exclude: ["tests/e2e/**", "tests/e2e-browser/**"]`
- `.gitignore` — 添加 Playwright artifacts (test-results/, playwright-report/)

## Verification

```bash
# 验证 API 集成测试
npm run test:e2e:setup && npm run test:e2e && npm run test:e2e:teardown

# 验证浏览器 E2E
npm run test:e2e:setup && npm run test:e2e:browser && npm run test:e2e:teardown

# 验证现有测试未被破坏
npm test
npm run typecheck
```
