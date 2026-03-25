# 8D Workflow Next Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the post-refactor product path by making `normal` mode truly model-driven, strengthening evidence extraction, finishing workflow UX parity, and retiring legacy mixed-flow code safely.

**Architecture:** Keep the single workflow contract centered in `backend/app/api/workflow.py` and `index.html`. Add narrow helpers for stage generation, sufficiency checks, and impact reasoning instead of spreading business rules across old `chat/orchestrator` paths. Treat `mockup` and `normal` as two explicit modes sharing the same state machine and API contract.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, inline HTML/JS frontend, pytest, Node test runner, OpenAI-compatible JSON LLM client

---

### Task 1: Lock The Scope And Refresh Recovery Docs

**Files:**
- Modify: `/Users/jilanfang/ai-quality/task_plan.md`
- Modify: `/Users/jilanfang/ai-quality/docs/current-handoff.md`
- Modify: `/Users/jilanfang/ai-quality/progress.md`

- [ ] **Step 1: Update `task_plan.md` with the new execution phases**

Add four pending phases:
- `normal` mode prompt chain
- extraction coverage expansion
- legacy flow cleanup
- full acceptance and docs refresh

- [ ] **Step 2: Update `docs/current-handoff.md` to reflect current frontend state**

Correct the frontend verification count from `25 passed` to `27 passed` and mention that stage manager drawer exists in the UI.

- [ ] **Step 3: Add a session log entry to `progress.md`**

Record that a new 4-part execution plan was created and will drive the next work.


### Task 2: Replace Placeholder `normal` Mode Stage Generation

**Files:**
- Modify: `/Users/jilanfang/ai-quality/backend/app/api/workflow.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/stage_collaboration.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/prompts.py`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_chat_api.py`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_stage_flow_api.py`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_prompt_builders.py`

- [ ] **Step 1: Write a failing backend test for `normal` mode D3 generation**

Add a test in [test_stage_flow_api.py](/Users/jilanfang/ai-quality/backend/tests/test_stage_flow_api.py) that:
- creates a `normal` mode case
- patches `get_llm_client_from_env()` or the stage generation helper
- confirms `D2`
- asserts `D3` working content comes from the model-backed path, not fallback text

- [ ] **Step 2: Run the targeted test and verify it fails for the expected reason**

Run:
```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_stage_flow_api.py::test_normal_mode_confirm_d2_prefills_d3_from_model_path -q
```

- [ ] **Step 3: Extract a dedicated stage-generation helper**

In [workflow.py](/Users/jilanfang/ai-quality/backend/app/api/workflow.py), replace the direct `SessionLocal()` call inside `_generate_stage_working_content()` with a helper that accepts the current session or prebuilt confirmed context.

- [ ] **Step 4: Expand prompt builders for stage-specific output**

In [prompts.py](/Users/jilanfang/ai-quality/backend/app/services/prompts.py), add stage-aware instructions so the model can produce:
- current stage suggestion text
- optional guidance / insufficiency warnings
- optional impact explanation

Keep JSON output narrow and stable.

- [ ] **Step 5: Update `stage_collaboration.py` to use the richer prompt contract**

Refactor [stage_collaboration.py](/Users/jilanfang/ai-quality/backend/app/services/stage_collaboration.py) so `generate_stage_working_content()` returns the stage text from the model path and falls back only when the model call fails.

- [ ] **Step 6: Keep explicit manual-edit behavior when the model is unavailable**

Preserve the existing rule in [workflow.py](/Users/jilanfang/ai-quality/backend/app/api/workflow.py):
- `normal` mode without LLM should warn and allow manual editing
- it must not pretend to be a real AI suggestion

- [ ] **Step 7: Add a failing test for D8 export prerequisites under `normal` mode**

Add a test in [test_chat_api.py](/Users/jilanfang/ai-quality/backend/tests/test_chat_api.py) asserting that `normal` mode still respects:
- `D1` export gate
- no export while impacted stages exist

- [ ] **Step 8: Run the targeted backend tests**

Run:
```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_chat_api.py tests/test_stage_flow_api.py tests/test_prompt_builders.py -q
```


### Task 3: Add Stage Sufficiency And Guidance Output To The Workflow API

**Files:**
- Modify: `/Users/jilanfang/ai-quality/backend/app/api/workflow.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/guided_thinking.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/core/schemas.py`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_schemas.py`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_stage_flow_api.py`

- [ ] **Step 1: Write a failing test for insufficiency guidance on D3/D4**

Add a test that posts thin evidence to a `normal` mode case and asserts the workflow response contains stage-relevant warnings or guided thinking instead of a silent generic placeholder.

- [ ] **Step 2: Extend the response shape only if needed**

If existing `warnings` and `guided_thinking` fields are enough, keep them. If not, minimally extend [schemas.py](/Users/jilanfang/ai-quality/backend/app/core/schemas.py) with a small structured field such as `stage_notes`.

- [ ] **Step 3: Compute stage sufficiency centrally in `workflow.py`**

Add a helper in [workflow.py](/Users/jilanfang/ai-quality/backend/app/api/workflow.py) that decides:
- whether the current stage has enough information
- what is missing
- which guidance should be shown next

- [ ] **Step 4: Reuse `guided_thinking.py` instead of duplicating logic**

Adjust [guided_thinking.py](/Users/jilanfang/ai-quality/backend/app/services/guided_thinking.py) only if the current `D2`/`D4` mapping is too narrow for the intended `D3-D7` guidance.

- [ ] **Step 5: Run the targeted tests**

Run:
```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_schemas.py tests/test_stage_flow_api.py -q
```


### Task 4: Expand Chinese Evidence Extraction Coverage

**Files:**
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/extractor.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/prompts.py`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_extractor.py`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_chat_api.py`

- [ ] **Step 1: Write failing extractor tests for the new manufacturing fields**

Add focused tests in [test_extractor.py](/Users/jilanfang/ai-quality/backend/tests/test_extractor.py) for:
- customer / project / model
- lot / date code variants
- line / station / work order
- containment actions
- validation records

- [ ] **Step 2: Run the extractor tests and verify the failures**

Run:
```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_extractor.py -q
```

- [ ] **Step 3: Extend heuristic extraction conservatively**

In [extractor.py](/Users/jilanfang/ai-quality/backend/app/services/extractor.py):
- add regex-based extraction for the new fields
- avoid overloading `problem_symptom`
- keep confidence/source consistent with existing facts

- [ ] **Step 4: Extend the extractor prompt contract**

Update [prompts.py](/Users/jilanfang/ai-quality/backend/app/services/prompts.py) so the LLM path knows these fields are desirable and should be preserved distinctly rather than merged into free text.

- [ ] **Step 5: Add a workflow-level regression test**

In [test_chat_api.py](/Users/jilanfang/ai-quality/backend/tests/test_chat_api.py), assert that multiple evidence submissions across days merge facts instead of replacing them.

- [ ] **Step 6: Run the targeted tests**

Run:
```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_extractor.py tests/test_chat_api.py -q
```


### Task 5: Finish Frontend Parity For Backend-Driven Stage Management

**Files:**
- Modify: `/Users/jilanfang/ai-quality/index.html`
- Test: `/Users/jilanfang/ai-quality/deck.test.mjs`

- [ ] **Step 1: Write a failing frontend test for backend-backed stage manager actions**

Add a test in [deck.test.mjs](/Users/jilanfang/ai-quality/deck.test.mjs) that simulates non-local mode and asserts:
- `stage manager` invokes `/stages/{stage}/unlock`
- `stage manager` invokes `/stages/{stage}/revalidate`
- preview and stage list refresh after the action

- [ ] **Step 2: Run the frontend test and verify it fails**

Run:
```bash
cd /Users/jilanfang/ai-quality
node --test deck.test.mjs
```

- [ ] **Step 3: Finish backend-connected drawer behavior**

In [index.html](/Users/jilanfang/ai-quality/index.html):
- make the drawer fully consume `payload.stages`
- show backend `impact_summary`
- update action states after backend responses
- ensure preview/stage manager drawers do not conflict visually

- [ ] **Step 4: Add D1 export-gate visibility to the drawer**

Expose `D1` status and report gating more clearly so users understand why export is blocked.

- [ ] **Step 5: Re-run the frontend suite**

Run:
```bash
cd /Users/jilanfang/ai-quality
node --test deck.test.mjs
```


### Task 6: Retire The Old Mixed Workflow Path

**Files:**
- Modify: `/Users/jilanfang/ai-quality/backend/app/api/chat.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/services/orchestrator.py`
- Modify: `/Users/jilanfang/ai-quality/backend/app/main.py`
- Modify: `/Users/jilanfang/ai-quality/docs/current-handoff.md`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_bootstrap.py`
- Test: `/Users/jilanfang/ai-quality/backend/tests/test_health.py`

- [ ] **Step 1: Decide the retirement mode**

Preferred path:
- keep legacy files for one more cycle
- make them explicitly non-routable and marked as deprecated in code comments/docs
- delete only after the new `normal` path is stable

- [ ] **Step 2: Write a failing regression test if any legacy route still leaks into the app**

Add or adjust a small app-router test to ensure only the intended active workflow endpoints are exposed for the main product path.

- [ ] **Step 3: Remove stale imports or dead references**

In [main.py](/Users/jilanfang/ai-quality/backend/app/main.py) and related files, ensure no old orchestration dependency is still required by the running app.

- [ ] **Step 4: Mark legacy files clearly**

Add a short module-level comment in [chat.py](/Users/jilanfang/ai-quality/backend/app/api/chat.py) and [orchestrator.py](/Users/jilanfang/ai-quality/backend/app/services/orchestrator.py) that they are retained only for historical reference / controlled cleanup.

- [ ] **Step 5: Run the small regression suite**

Run:
```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_bootstrap.py tests/test_health.py tests/test_orchestrator.py -q
```


### Task 7: Full Acceptance Pass

**Files:**
- Modify: `/Users/jilanfang/ai-quality/docs/current-handoff.md`
- Modify: `/Users/jilanfang/ai-quality/progress.md`
- Modify: `/Users/jilanfang/ai-quality/findings.md`

- [ ] **Step 1: Run frontend verification**

Run:
```bash
cd /Users/jilanfang/ai-quality
node --test deck.test.mjs
```

- [ ] **Step 2: Run targeted backend verification serially**

Run:
```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests/test_cases_api.py tests/test_schemas.py tests/test_chat_api.py tests/test_stage_flow_api.py tests/test_stage_state_repository.py tests/test_extractor.py tests/test_prompt_builders.py -q
```

- [ ] **Step 3: Run full backend verification serially**

Run:
```bash
cd /Users/jilanfang/ai-quality/backend
.venv/bin/python -m pytest tests -q
```

- [ ] **Step 4: Refresh recovery docs with real counts and residual risks**

Update:
- [current-handoff.md](/Users/jilanfang/ai-quality/docs/current-handoff.md)
- [progress.md](/Users/jilanfang/ai-quality/progress.md)
- [findings.md](/Users/jilanfang/ai-quality/findings.md)

- [ ] **Step 5: Capture residual risks explicitly**

Document any remaining gaps, especially:
- prompt quality tuning
- LLM reliability / timeout behavior
- SQLite limitations under concurrent development
