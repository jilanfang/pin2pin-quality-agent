# SKILLS.md

## Purpose

- This file holds `ai-quality`-specific implementation lessons, model-routing rules, backlog discipline, and design triggers.
- Keep these detailed project lessons here instead of expanding `AGENTS.md`.

## Triggered Guidance

### Runtime And Storage Lessons

- Do not describe no-db mode as pure memory mode.
- The real no-db behavior is local file storage.
- Read `AI_QUALITY_STORE_PATH` first, then fall back to `/tmp/ai-quality-demo-store.json`.
- Do not run `next dev` and `next start` in the same working directory at the same time unless you isolate build output.
- Production verification must include homepage load, `_next/static` assets, and browser console state, not only API health.
- Small console errors still matter before demos. Keep the console clean.

### Dev Environment Lessons

- On this machine, prefer polling for dev mode to avoid `EMFILE` watcher issues.
- The validated dev script is:

```json
"dev": "WATCHPACK_POLLING=true next dev --hostname 127.0.0.1 --port 3001"
```

- Do not casually change it back to plain `next dev` unless watcher behavior has been re-verified.

### LLM Routing Rules

- Multi-model routing must be designed by provider failure domain, not only by model-name fallback.
- Split configuration by capability such as:
  - `extract`
  - `copilot`
  - `report`
- Each capability should have its own primary and fallback provider/model pair.
- `ark` must match its own endpoint before any generic OpenAI-compatible gateway logic.
- Generic gateway behavior should stay scoped to providers like `vectorengine`.
- All online model integration must route through `lib/server/llm.ts`.
- Do not add provider, model, or endpoint logic directly into:
  - `lib/domain/workflow-engine.ts`
  - `lib/domain/guided-thinking.ts`
  - `lib/domain/report-builder.ts`
  - `components/workspace.tsx`

### Benchmark Rules

- Benchmarking must separate gradual case-building ability from final polished report-writing ability.
- Use at least two views:
  - multi-turn progressive inputs to judge question quality, restraint, and workflow fit
  - full-draft tests to judge final 8D completeness and tone
- Current working conclusion:
  - `deepseek-v3.2` fits primary Copilot better
  - `qwen3.5-122b-a10b` fits final polished output better
  - `ark-code-latest` is a valuable cross-provider backup
  - `MiniMax-M2.7` is currently unstable under strict JSON protocol

### Backlog And Design Discipline

- `docs/mvp-hardening-checklist.md` is the only long-term backlog source of truth.
- `docs/index-html-to-nextjs-migration-ledger.md` is the only ledger for mockup and mainline differences.
- `task_plan.md`, `progress.md`, and `findings.md` are recovery artifacts, not long-term backlog containers.
- New implementation todos should go into the main backlog, not parallel docs.
- Before making visual, UI, or report-style decisions, read `DESIGN.md`.
- Call out implementations that drift from `DESIGN.md` during design QA.
