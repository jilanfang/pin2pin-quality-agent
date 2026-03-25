# 输出层与出稿门槛实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为当前 8D 工作流补齐统一输出中间层、文风参数、文本/正式报告双输出，以及 `24h 初版 / interim / final` 的出稿 gating。

**Architecture:** 在现有 workflow 与 draft preview 基础上，引入稳定的 `Output Document` 中间对象，先把内容层、文风层、渲染层拆开，再把版本状态与 export gating 接到现有 `/draft-preview` 与 `/report` 路径。实现上优先保证结构化状态一致，再做 HTML 渲染和 PDF 预留，不追求一次性完成全部导出能力。

**Tech Stack:** FastAPI, Pydantic schemas, existing backend workflow services, single-file frontend (`index.html`), Node test runner, pytest

---

## 实施前说明

这个计划只覆盖下面这些范围：

- 输出层中间对象
- 文风参数传递
- 文本 / 正式报告双输出
- 版本状态字段
- `24h 初版 / interim / final` 的 gating

这个计划不覆盖：

- 真正的 PDF 导出实现
- 多 HTML 风格
- 公司模板适配
- 更大的 prompt chain 重构

## 代码边界预估

### 后端重点文件

- Modify: `/Users/jilanfang/ai-quality/backend/app/core/schemas.py`
  - 增加输出层相关 schema
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/draft_generator.py`
  - 从“直接给一段稿子”升级为“先构建结构化输出对象”
- Modify: `/Users/jilanfang/ai-quality/backend/app/api/workflow.py`
  - 让 preview / report 返回新的输出字段与 gating 信息
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/stage_collaboration.py`
  - 如有必要，补充阶段成熟度与待验证项汇总
- Create: `/Users/jilanfang/ai-quality/backend/app/services/output_document.py`
  - 统一构建 `Output Document`
- Create: `/Users/jilanfang/ai-quality/backend/app/services/style_mapper.py`
  - 负责文风映射
- Create: `/Users/jilanfang/ai-quality/backend/app/services/renderers/text_renderer.py`
  - 负责文本输出
- Create: `/Users/jilanfang/ai-quality/backend/app/services/renderers/html_renderer.py`
  - 负责正式报告 HTML 输出
- Create: `/Users/jilanfang/ai-quality/backend/app/services/report_readiness.py`
  - 负责版本判断与 gating

### 前端重点文件

- Modify: `/Users/jilanfang/ai-quality/index.html`
  - 增加文风选择
  - 增加文本 / 正式报告切换
  - 呈现 output status / case status / export gating

### 测试文件

- Modify: `/Users/jilanfang/ai-quality/backend/tests/test_schemas.py`
- Modify: `/Users/jilanfang/ai-quality/backend/tests/test_stage_flow_api.py`
- Modify: `/Users/jilanfang/ai-quality/backend/tests/test_chat_api.py`
- Create: `/Users/jilanfang/ai-quality/backend/tests/test_output_document.py`
- Create: `/Users/jilanfang/ai-quality/backend/tests/test_report_readiness.py`
- Create: `/Users/jilanfang/ai-quality/backend/tests/test_renderers.py`
- Modify: `/Users/jilanfang/ai-quality/deck.test.mjs`

## Task 1: 定义输出层 schema

**Files:**
- Create: `/Users/jilanfang/ai-quality/backend/tests/test_output_document.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/core/schemas.py`
- Modify: `/Users/jilanfang/ai-quality/backend/tests/test_schemas.py`

- [ ] **Step 1: 写失败测试，覆盖 `Output Document` 顶层结构**

测试至少覆盖：

- `document_id`
- `case_id`
- `language`
- `style_mode`
- `output_status`
- `case_status`
- `summary`
- `sections`
- `pending_items`
- `risk_flags`
- `metadata`

- [ ] **Step 2: 运行后端单测，确认 schema 测试失败**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_output_document.py tests/test_schemas.py -q
```

Expected:

- 因缺少 schema 定义而失败

- [ ] **Step 3: 在 `schemas.py` 增加输出层相关 schema**

至少增加：

- `OutputDocumentSummary`
- `OutputContentBlock`
- `OutputSection`
- `OutputDocument`

同时定义枚举或受限字段：

- `style_mode`
- `output_status`
- `case_status`
- `maturity`

- [ ] **Step 4: 重新运行 schema 相关测试并确认通过**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_output_document.py tests/test_schemas.py -q
```

Expected:

- PASS

## Task 2: 实现出稿门槛判断服务

**Files:**
- Create: `/Users/jilanfang/ai-quality/backend/app/services/report_readiness.py`
- Create: `/Users/jilanfang/ai-quality/backend/tests/test_report_readiness.py`

- [ ] **Step 1: 写失败测试，覆盖三种版本判断**

至少覆盖：

- 证据不足时不允许 `24h 初版`
- 满足最小条件时允许 `24h 初版`
- `interim` 需要更稳定的 D2/D3/D4/D5/D6
- 缺少验证结果时不允许 `final`
- 存在 blocker 时案件必须保持 `open`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_report_readiness.py -q
```

Expected:

- 因服务不存在或规则未实现而失败

- [ ] **Step 3: 实现 `report_readiness.py`**

输出建议至少包含：

- `allowed_output_statuses`
- `recommended_output_status`
- `case_status`
- `blocks_export`
- `pending_items`
- `reason_codes`

- [ ] **Step 4: 重新运行 readiness 测试**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_report_readiness.py -q
```

Expected:

- PASS

## Task 3: 构建输出中间层服务

**Files:**
- Create: `/Users/jilanfang/ai-quality/backend/app/services/output_document.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/draft_generator.py`
- Modify: `/Users/jilanfang/ai-quality/backend/tests/test_output_document.py`

- [ ] **Step 1: 写失败测试，验证从案件状态生成结构化输出对象**

至少覆盖：

- D1-D8 sections 顺序稳定
- D4 / D5 / D6 能挂 `maturity`
- `pending_items` 能从案件状态与 warnings 中汇总
- `summary` 能稳定包含头部关键信息

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_output_document.py -q
```

Expected:

- 因中间层服务不存在而失败

- [ ] **Step 3: 实现 `output_document.py`**

要求：

- 先组织内容层，不生成最终 HTML
- 不在此层做文风差异
- 明确保留：
  - `pending_items`
  - `risk_flags`
  - `maturity`
  - `case_status`

- [ ] **Step 4: 调整 `draft_generator.py`，让其返回结构化输出对象所需数据**

要求：

- 尽量少破坏已有接口
- 优先采用兼容式新增字段

- [ ] **Step 5: 重新运行相关测试**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_output_document.py tests/test_schemas.py -q
```

Expected:

- PASS

## Task 4: 实现文风映射层

**Files:**
- Create: `/Users/jilanfang/ai-quality/backend/app/services/style_mapper.py`
- Create: `/Users/jilanfang/ai-quality/backend/tests/test_renderers.py`

- [ ] **Step 1: 写失败测试，覆盖三种文风映射**

至少覆盖：

- `professional_neutral`
- `customer_formal`
- `internal_direct`

测试重点：

- 同一事实在三种文风下表达不同
- `待验证` 标签不会被删掉
- `open` 不会被映射成 `closed`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_renderers.py -q
```

Expected:

- 因文风映射器不存在而失败

- [ ] **Step 3: 实现 `style_mapper.py`**

要求：

- 只改表达，不改状态
- 尽量采用小函数或策略映射
- 不要把方法论判断塞进文风映射器

- [ ] **Step 4: 重新运行文风相关测试**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_renderers.py -q
```

Expected:

- PASS

## Task 5: 实现文本 renderer

**Files:**
- Create: `/Users/jilanfang/ai-quality/backend/app/services/renderers/text_renderer.py`
- Modify: `/Users/jilanfang/ai-quality/backend/tests/test_renderers.py`

- [ ] **Step 1: 写失败测试，验证文本输出的结构**

至少覆盖：

- 头部摘要存在
- D1-D8 标题稳定
- `待验证`
- `案件状态：Open`
- 风险与 pending 项不会消失

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_renderers.py -q
```

Expected:

- 文本 renderer 缺失导致失败

- [ ] **Step 3: 实现 `text_renderer.py`**

要求：

- 输出给 UI 的名字仍叫“文本”
- 底层可使用 markdown-like 结构
- 但不要把 UI 命名绑死为 markdown

- [ ] **Step 4: 重新运行文本渲染测试**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_renderers.py -q
```

Expected:

- PASS

## Task 6: 实现 HTML renderer

**Files:**
- Create: `/Users/jilanfang/ai-quality/backend/app/services/renderers/html_renderer.py`
- Modify: `/Users/jilanfang/ai-quality/backend/tests/test_renderers.py`

- [ ] **Step 1: 写失败测试，验证正式报告 HTML 的关键结构**

至少覆盖：

- 报告头部字段
- D1-D8 区块
- `Open / 待验证` 标签
- 当前只使用一套固定风格

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_renderers.py -q
```

Expected:

- HTML renderer 缺失导致失败

- [ ] **Step 3: 实现 `html_renderer.py`**

要求：

- 先做单一中文工程报告风格
- 结构优先，样式适中
- 为后续 `HTML -> PDF` 保留清晰 DOM 结构和打印样式入口

- [ ] **Step 4: 重新运行渲染测试**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_renderers.py -q
```

Expected:

- PASS

## Task 7: 接入 workflow API

**Files:**
- Modify: `/Users/jilanfang/ai-quality/backend/app/api/workflow.py`
- Modify: `/Users/jilanfang/ai-quality/backend/tests/test_stage_flow_api.py`

- [ ] **Step 1: 写失败测试，覆盖 preview 返回新字段**

至少覆盖：

- `output_status`
- `case_status`
- `style_mode`
- `text_output`
- `html_output`
- `blocks_export`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_stage_flow_api.py -q
```

Expected:

- 因接口字段缺失而失败

- [ ] **Step 3: 在 `workflow.py` 中接入 readiness + output_document + renderers**

要求：

- `draft-preview` 返回双输出
- `report` 路由遵守 final gating
- 不破坏现有 mockup/normal 行为

- [ ] **Step 4: 重新运行接口测试**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_stage_flow_api.py tests/test_chat_api.py -q
```

Expected:

- PASS

## Task 8: 前端接入文风与双输出

**Files:**
- Modify: `/Users/jilanfang/ai-quality/index.html`
- Modify: `/Users/jilanfang/ai-quality/deck.test.mjs`

- [ ] **Step 1: 写失败测试，覆盖前端展示逻辑**

至少覆盖：

- 文风选择存在
- 可在 `文本 / 正式报告` 之间切换
- 能看到 `Open / 待验证 / output_status`
- final 不满足时按钮或提示正确

- [ ] **Step 2: 运行前端测试确认失败**

Run:

```bash
cd /Users/jilanfang/ai-quality
node --test deck.test.mjs
```

Expected:

- 因 UI 尚未接入而失败

- [ ] **Step 3: 在 `index.html` 中接入新字段**

要求：

- UI 文案使用：
  - `文本`
  - `正式报告`
  - `文风`
- 默认：
  - `专业克制`
  - 首屏显示 `文本`
- 明确展示 `Open / 待验证 / 版本状态`

- [ ] **Step 4: 重新运行前端测试**

Run:

```bash
cd /Users/jilanfang/ai-quality
node --test deck.test.mjs
```

Expected:

- PASS

## Task 9: 做一次最小回归验证

**Files:**
- Modify: `/Users/jilanfang/ai-quality/docs/current-handoff.md`
- Modify: `/Users/jilanfang/ai-quality/progress.md`

- [ ] **Step 1: 运行后端核心测试**

Run:

```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_output_document.py tests/test_report_readiness.py tests/test_renderers.py tests/test_stage_flow_api.py tests/test_schemas.py -q
```

Expected:

- PASS

- [ ] **Step 2: 运行前端测试**

Run:

```bash
cd /Users/jilanfang/ai-quality
node --test deck.test.mjs
```

Expected:

- PASS

- [ ] **Step 3: 更新 handoff 与 progress**

记录：

- 新增输出层服务
- 新增字段
- 当前支持的文风与输出形式
- 当前 HTML/PDF 状态

- [ ] **Step 4: Commit**

```bash
git add /Users/jilanfang/ai-quality/backend/app /Users/jilanfang/ai-quality/backend/tests /Users/jilanfang/ai-quality/index.html /Users/jilanfang/ai-quality/deck.test.mjs /Users/jilanfang/ai-quality/docs/current-handoff.md /Users/jilanfang/ai-quality/progress.md
git commit -m "feat: add output layer and report gating"
```

## 执行顺序建议

推荐顺序：

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9

原因：

- 先把 schema 和 gating 打稳
- 再做中间层
- 最后再接入渲染和 UI

## 当前阶段最重要的验收标准

实现完成后，至少要满足：

- 同一案件可以稳定得到：
  - `文本`
  - `正式报告 HTML`
- 三种文风只改变表达，不改变证据状态
- `24h 初版 / interim / final` 的边界清楚
- 系统不会在证据不足时给出“假 final”
- 前后端都能正确展示 `Open / 待验证 / 版本状态`
