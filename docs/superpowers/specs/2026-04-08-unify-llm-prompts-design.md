# Unified LLM Prompts Design

**Date:** 2026-04-08

**Goal**

把当前真实在线的提示词统一收口到一个地方管理，方便后续调优，同时不改变现有 `extract`、`conversation`、`copilot` 的运行行为。

**Scope**

- 只处理当前在线提示词：
  - `extract`
  - `conversation`
  - `copilot`
- 不扩展到历史归档文档里的旧 prompt 草稿
- 不引入独立 prompt 后台
- 不引入 `.md` / `.txt` 模板加载系统

**Design**

- 新建 `lib/server/prompts/` 作为唯一提示词目录
- 按能力拆分文件：
  - `lib/server/prompts/extract.ts`
  - `lib/server/prompts/conversation.ts`
  - `lib/server/prompts/copilot.ts`
  - `lib/server/prompts/index.ts`
- `lib/server/llm.ts` 只保留：
  - provider 路由
  - timeout
  - request / response 处理
  - schema 解析
- `lib/server/llm.ts` 不再内联提示词正文

**Why This Shape**

- 与当前 capability 路由方式一致，后续调优时不需要在大文件里找 prompt
- 比单一 `prompts.ts` 更容易扩展
- 比外部模板系统更轻，当前阶段更容易测试和回归

**Verification**

- 新增测试，锁定 `llm.ts` 不再内联提示词
- 保持现有 LLM adapter 测试通过
- 运行 `npm test`
- 运行 `npm run typecheck`
