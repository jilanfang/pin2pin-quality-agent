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

### LLM Configuration

- 直接读取当前 `.env` 中已配置的真实 API key
- 测试启动时检查必要的 key 是否存在，缺失则跳过全部 E2E 并输出清晰提示
- 超时配置: E2E 专用 `AI_QUALITY_LLM_CONVERSATION_TIMEOUT_MS=15000`
- 不创建单独的 `.env.test`，使用 `.env` + 环境变量覆盖 `DATABASE_URL`

### Schema Setup

- `npm run db:push` 对 test database 执行 schema 同步
- 每个测试文件 `beforeAll` 验证连接可用
- 每个测试用例 `afterEach` 清理自己创建的 case 数据

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
    maxWorkers: 1,               // 串行，避免 DB 竞争
    globalSetup: ["tests/e2e/e2e-setup.ts"],
    setupFiles: [],              // 不需要 jsdom
    environment: "node",         // Node 环境
  }
}
```

### e2e-setup.ts

职责:
1. **Docker Postgres lifecycle**: `docker compose -f docker-compose.test.yml up -d --wait`
2. **Schema push**: 设置 `DATABASE_URL` → `drizzle-kit push`
3. **LLM key 验证**: 检查 `AI_QUALITY_LLM_ENABLED`、provider key 是否存在
4. **teardown**: `docker compose -f docker-compose.test.yml down -v`

### e2e-helpers.ts

```typescript
export function getTestDatabaseUrl(): string
export async function createTestCase(title: string): Promise<CaseAggregate>
export async function cleanupTestCase(caseId: string): Promise<void>
export function assertFactExtracted(facts: FactItem[], field: string, expectedValuePattern: string | RegExp): void
export function assertChineseText(text: string, minLength?: number): void
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

```typescript
{
  testDir: ".",
  timeout: 60_000,
  retries: 1,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3001" },
  webServer: {
    command: "DATABASE_URL=postgres://test_user:test_pass@localhost:5433/ai_quality_test npm run dev",
    url: "http://127.0.0.1:3001/api/health",
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  }
}
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
  "test:e2e:setup": "docker compose -f docker-compose.test.yml up -d --wait",
  "test:e2e:teardown": "docker compose -f docker-compose.test.yml down -v",
  "test:e2e": "vitest run --config vitest.e2e.config.ts",
  "test:e2e:browser": "npx playwright test --config tests/e2e-browser/playwright.config.ts"
}
```

正常运行流程:
```bash
npm run test:e2e:setup      # 启动 Docker Postgres
npm run test:e2e             # API 集成测试
npm run test:e2e:browser     # 浏览器 E2E (会自动启动 Next.js)
npm run test:e2e:teardown    # 清理
```

## Assertion Strategy (严格内容断言)

LLM 输出有不确定性，但对于结构化输入（客诉邮件包含明确的客户名、型号等），LLM 应当稳定提取这些关键信息。断言规则:

1. **枚举字段**: `intents`, `sourceShape`, `caseOperation`, `responseMode` — 精确匹配
2. **事实字段**: `knownFacts` 中的 `customer`, `model` 等 — 验证 field 存在且 value 包含输入中的关键词
3. **文本字段**: `assistantReplyDraft`, copilot 回答 — 验证是中文、长度合理、包含领域关键词
4. **结构字段**: `thinking.steps` 非空数组, `confidence` 在 0-1 范围内
5. **持久化一致性**: Postgres 写入后重新读取，验证关键字段一致

对于不稳定的断言，使用 `expect.soft()` 标记为 soft assertion，失败时报告但不中断测试。

## New Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.52.0"
  }
}
```

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
