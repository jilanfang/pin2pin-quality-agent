# Stage-Driven 8D Collaboration Flow Implementation Plan

> Status: partially implemented and now mainly historical. The repo already contains stage-driven backend/frontend work; use `docs/current-handoff.md` for latest status before continuing this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current extract-and-auto-draft MVP flow with a strict stage-driven D2-D8 collaboration flow where the user edits and confirms one 8D stage at a time.

**Architecture:** Keep `Case` as the top-level entity, but stop treating one chat turn as the whole workflow. Add stage-specific persisted state so the backend can continuously regenerate the current stage from confirmed prior stages, while only advancing when the user explicitly confirms. The frontend becomes a current-stage workspace plus final report aggregator instead of a one-shot draft viewer.

**Tech Stack:** FastAPI, SQLite/SQLAlchemy, inline frontend JavaScript in `index.html`, pytest, Node test runner

---

## File Structure

**Backend files to modify**
- `backend/app/core/schemas.py`
  Add stage-collaboration response/request schemas and explicit D-stage enums.
- `backend/app/db/models.py`
  Add persistent stage content records for confirmed and working stage drafts.
- `backend/app/api/chat.py`
  Replace free-form message intake semantics with current-stage update and confirm semantics.
- `backend/app/api/cases.py`
  Expand case payloads to expose current D-stage and stage progress.
- `backend/app/repositories/fact_snapshots.py`
  Either adapt or partially retire current snapshot persistence in favor of stage-state persistence.
- `backend/app/repositories/cases.py`
  Support new current-stage transition behavior.
- `backend/app/services/extractor.py`
  Restrict extraction to D2 working-state updates instead of global workflow advancement.
- `backend/app/services/orchestrator.py`
  Replace current “missing fields -> analysis -> draft” logic with explicit stage transition rules.
- `backend/app/services/guided_thinking.py`
  Keep per-stage thinking coach output, but align it to the active D-stage.
- `backend/app/services/prompts.py`
  Add per-stage generation prompts for D3, D4, D5, D6, D7, D8.
- `backend/app/services/draft_generator.py`
  Convert from whole-report generator to final report aggregator over confirmed D2-D8 stage content.

**Backend files to create**
- `backend/app/repositories/stage_states.py`
  CRUD helpers for working and confirmed stage content.
- `backend/tests/test_stage_flow_api.py`
  End-to-end API tests for stage update, confirm, and sequential advance behavior.
- `backend/tests/test_stage_state_repository.py`
  Persistence tests for stage state records.

**Frontend files to modify**
- `index.html`
  Rework current state model, stage workspace, confirm action, current-stage regeneration handling, and final report view.
- `deck.test.mjs`
  Replace auto-draft assumptions with staged collaboration tests.

---

### Task 1: Define the new stage contract in tests

**Files:**
- Modify: `backend/tests/test_chat_api.py`
- Create: `backend/tests/test_stage_flow_api.py`
- Modify: `deck.test.mjs`

- [ ] **Step 1: Write the failing backend API test for D2 working updates**

```python
def test_stage_flow_updates_d2_without_advancing_until_confirm():
    ...
```

- [ ] **Step 2: Run the backend stage-flow test to verify it fails**

Run: `cd backend && .venv/bin/python -m pytest tests/test_stage_flow_api.py -q`
Expected: FAIL because the stage-flow API and persistence do not exist.

- [ ] **Step 3: Write the failing frontend test for “edit current stage, confirm to advance”**

```javascript
test("frontend keeps editing D2 until user confirms", async () => {
  ...
});
```

- [ ] **Step 4: Run the frontend test to verify it fails**

Run: `node --test deck.test.mjs`
Expected: FAIL because the UI still assumes message-by-message progression and auto drafting.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_chat_api.py backend/tests/test_stage_flow_api.py deck.test.mjs
git commit -m "test: define staged 8d collaboration flow"
```

### Task 2: Add persistent stage state storage

**Files:**
- Modify: `backend/app/db/models.py`
- Create: `backend/app/repositories/stage_states.py`
- Create: `backend/tests/test_stage_state_repository.py`

- [ ] **Step 1: Write the failing repository test for storing working and confirmed stage content**

```python
def test_stage_state_repository_stores_working_and_confirmed_content():
    ...
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `cd backend && .venv/bin/python -m pytest tests/test_stage_state_repository.py -q`
Expected: FAIL because the model and repository do not exist.

- [ ] **Step 3: Add the minimal `StageState` model**

```python
class StageState(Base):
    __tablename__ = "stage_states"
```

- [ ] **Step 4: Add minimal repository helpers**

```python
def upsert_stage_state(...): ...
def get_stage_state(...): ...
```

- [ ] **Step 5: Run the repository test to verify it passes**

Run: `cd backend && .venv/bin/python -m pytest tests/test_stage_state_repository.py -q`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/db/models.py backend/app/repositories/stage_states.py backend/tests/test_stage_state_repository.py
git commit -m "feat: add persisted stage state storage"
```

### Task 3: Introduce explicit D-stage schemas and transitions

**Files:**
- Modify: `backend/app/core/schemas.py`
- Modify: `backend/app/services/orchestrator.py`
- Modify: `backend/tests/test_orchestrator.py`

- [ ] **Step 1: Write the failing orchestrator test for confirm-only stage advancement**

```python
def test_orchestrator_advances_only_when_stage_is_confirmed():
    ...
```

- [ ] **Step 2: Run orchestrator tests to verify failure**

Run: `cd backend && .venv/bin/python -m pytest tests/test_orchestrator.py -q`
Expected: FAIL because current transitions are message-driven, not confirm-driven.

- [ ] **Step 3: Add explicit stage enums and transition inputs**

```python
EightDStage = Literal["D2", "D3", "D4", "D5", "D6", "D7", "D8"]
```

- [ ] **Step 4: Implement minimal transition logic**

```python
def decide_next_stage(current_stage, confirm_current): ...
```

- [ ] **Step 5: Run orchestrator tests to verify pass**

Run: `cd backend && .venv/bin/python -m pytest tests/test_orchestrator.py -q`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/core/schemas.py backend/app/services/orchestrator.py backend/tests/test_orchestrator.py
git commit -m "feat: add explicit d-stage transitions"
```

### Task 4: Rework backend chat/stage API around current-stage updates

**Files:**
- Modify: `backend/app/api/chat.py`
- Modify: `backend/app/api/cases.py`
- Modify: `backend/app/repositories/fact_snapshots.py`
- Modify: `backend/tests/test_chat_api.py`
- Modify: `backend/tests/test_stage_flow_api.py`

- [ ] **Step 1: Write the failing API test for “update current stage content” and “confirm current stage”**

```python
def test_stage_flow_api_updates_d3_from_confirmed_d2():
    ...
```

- [ ] **Step 2: Run the API tests to verify failure**

Run: `cd backend && .venv/bin/python -m pytest tests/test_chat_api.py tests/test_stage_flow_api.py -q`
Expected: FAIL because existing endpoint only supports generic message intake.

- [ ] **Step 3: Add request/response shapes for stage update and confirm semantics**

```python
class StageUpdateRequest(BaseModel):
    content: str
    confirm: bool = False
```

- [ ] **Step 4: Implement current-stage update behavior**

```python
if current_stage == "D2":
    ...
```

- [ ] **Step 5: Implement confirm behavior to generate the next stage from confirmed prior stages**

```python
if payload.confirm:
    ...
```

- [ ] **Step 6: Run the API tests to verify pass**

Run: `cd backend && .venv/bin/python -m pytest tests/test_chat_api.py tests/test_stage_flow_api.py -q`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/chat.py backend/app/api/cases.py backend/app/repositories/fact_snapshots.py backend/tests/test_chat_api.py backend/tests/test_stage_flow_api.py
git commit -m "feat: rework api for stage-based collaboration"
```

### Task 5: Add per-stage prompt generation

**Files:**
- Modify: `backend/app/services/prompts.py`
- Modify: `backend/app/services/guided_thinking.py`
- Modify: `backend/tests/test_prompt_builders.py`
- Modify: `backend/tests/test_guided_thinking.py`

- [ ] **Step 1: Write the failing prompt-builder tests for D3-D8 generation prompts**

```python
def test_build_stage_prompt_includes_confirmed_prior_stage_context():
    ...
```

- [ ] **Step 2: Run prompt tests to verify failure**

Run: `cd backend && .venv/bin/python -m pytest tests/test_prompt_builders.py tests/test_guided_thinking.py -q`
Expected: FAIL because only extractor/orchestrator/general guidance prompts exist.

- [ ] **Step 3: Implement minimal stage-specific prompt builders**

```python
def build_d3_prompt(...): ...
def build_d4_prompt(...): ...
...
```

- [ ] **Step 4: Keep guidance output limited to one action per stage**

```python
return GuidedThinkingResult(...)
```

- [ ] **Step 5: Run prompt tests to verify pass**

Run: `cd backend && .venv/bin/python -m pytest tests/test_prompt_builders.py tests/test_guided_thinking.py -q`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/prompts.py backend/app/services/guided_thinking.py backend/tests/test_prompt_builders.py backend/tests/test_guided_thinking.py
git commit -m "feat: add stage-specific generation prompts"
```

### Task 6: Replace whole-report generation with final report aggregation

**Files:**
- Modify: `backend/app/services/draft_generator.py`
- Modify: `backend/tests/test_draft_generator.py`

- [ ] **Step 1: Write the failing test for aggregating confirmed D2-D8 content**

```python
def test_generate_draft_aggregates_confirmed_stage_content():
    ...
```

- [ ] **Step 2: Run draft generator tests to verify failure**

Run: `cd backend && .venv/bin/python -m pytest tests/test_draft_generator.py -q`
Expected: FAIL because the current generator fabricates a whole report from generic facts.

- [ ] **Step 3: Implement minimal final report aggregation**

```python
def generate_draft(...):
    ...
```

- [ ] **Step 4: Leave D1 intentionally blank and generate D8 from D2-D7 confirmed content**

```python
sections = [...]
```

- [ ] **Step 5: Run draft generator tests to verify pass**

Run: `cd backend && .venv/bin/python -m pytest tests/test_draft_generator.py -q`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/draft_generator.py backend/tests/test_draft_generator.py
git commit -m "feat: aggregate final report from confirmed stages"
```

### Task 7: Rebuild the frontend as a current-stage workspace

**Files:**
- Modify: `index.html`
- Modify: `deck.test.mjs`

- [ ] **Step 1: Write the failing frontend tests for stage workspace and explicit confirmation**

```javascript
test("frontend updates current stage continuously and advances only on confirm", async () => {
  ...
});
```

- [ ] **Step 2: Run frontend tests to verify failure**

Run: `node --test deck.test.mjs`
Expected: FAIL because the UI still assumes generic chat + free advance behavior.

- [ ] **Step 3: Replace generic stage display with explicit current-stage editor and confirmed-stage summary**

```javascript
function renderStageWorkspace(project) { ... }
```

- [ ] **Step 4: Add a dedicated confirm action distinct from free-form editing**

```javascript
async function handleConfirmStage() { ... }
```

- [ ] **Step 5: Render final report only after confirmed D8**

```javascript
function renderFinalReport(project) { ... }
```

- [ ] **Step 6: Run frontend tests to verify pass**

Run: `node --test deck.test.mjs`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add index.html deck.test.mjs
git commit -m "feat: add stage-driven frontend workspace"
```

### Task 8: Run integrated verification

**Files:**
- Modify: files above only if verification reveals issues

- [ ] **Step 1: Run the backend suite**

Run: `cd backend && .venv/bin/python -m pytest tests -q`
Expected: PASS

- [ ] **Step 2: Run the frontend suite**

Run: `node --test deck.test.mjs`
Expected: PASS

- [ ] **Step 3: Run the LLM connectivity check**

Run: `cd backend && .venv/bin/python scripts/test_llm_connection.py`
Expected: JSON response showing `gpt-5.4-mini`

- [ ] **Step 4: Manually verify stage progression**

Run:
```bash
cd backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```
and
```bash
cd /Users/jilanfang/ai-quality && python3 -m http.server 3008 --bind 127.0.0.1
```
Expected: User can work through D2, confirm into D3, then continue through D8 without premature whole-report generation.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: implement stage-driven 8d collaboration flow"
```
