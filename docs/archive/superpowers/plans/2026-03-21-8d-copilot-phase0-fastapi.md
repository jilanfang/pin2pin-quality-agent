# 8D Copilot Phase 0 FastAPI Implementation Plan

> Status: historical implementation plan. Keep for context and task decomposition, but use `docs/current-handoff.md` as the current source of truth.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Status Snapshot (Updated 2026-03-21)

This plan has been substantially executed. New threads should treat the checklist below as historical implementation guidance and use this snapshot as the current baseline.

### What is already done

- Backend MVP is implemented under `backend/`
- FastAPI endpoints exist for:
  - `GET /health`
  - `POST /cases`
  - `GET /cases`
  - `POST /cases/{case_id}/messages`
- Core services are implemented:
  - extractor
  - orchestrator
  - guided thinking
  - draft generator
- All four core AI services now follow `prompt + fallback`
- `GenerationMeta` is implemented and returned with draft responses
- Draft generation is framed with `electronics_quality_engineer_v1`
- Frontend MVP is implemented as a single-file app in `index.html`
- Frontend now displays generation metadata and supports:
  - project list
  - chat thread
  - image upload
  - 8D preview drawer
  - local fallback reasoning
- Local frontend/backend integration has been completed for development:
  - frontend static page uses `http://localhost:8001` when opened from localhost
  - FastAPI allows CORS from `http://localhost:3008`
- Basic Chinese extraction has been added in both frontend fallback and backend extractor for:
  - batch
  - discovery date
  - impact
  - customer scenario

### Latest verification

- Backend full test suite: `26 passed`
- Frontend test suite: `14 passed`
- Manual local API probe with Chinese input:
  - `客户反馈批次B12在2026-03-01发现黑屏异常，影响120台。`
  - result: extracted `batch`, `discovery_time`, `impact`, entered `analysis`, and generated draft

### Current recommended next steps

1. Improve Chinese extraction coverage beyond the current minimum:
   - product / model
   - customer name
   - lot / date code
   - line / station / work order
   - containment actions
2. Improve first-message UX in the frontend:
   - clearer backend-connected badge
   - show whether the current turn used backend or local fallback
3. Decide deployment direction:
   - frontend-only on Vercel for demo
   - backend separate if persistent API access is required
4. If moving toward expert review, continue tightening D2 / D4 / D5-D7 professional depth

### Current paused WIP

A newer in-progress change was started and then paused mid-way:

- goal: support accumulated multi-turn case state, `进入下一步` force-advance behavior, and frontend stage visibility
- backend portion of this work is already implemented and passing targeted tests
- frontend portion is not finished yet

At pause time:

- backend targeted tests for this feature: passing
- frontend tests for this feature: failing because `index.html` has not been updated yet

The next thread should resume by finishing the frontend implementation to match the already-updated backend contract:

- request payload supports `force_advance`
- response payload supports `force_advanced`
- backend now accumulates known facts across turns via fact snapshots

**Goal:** Build the Phase 0 MVP backend for a chat-first 8D Copilot that accepts text case input, extracts structured facts, asks one next question, and generates an initial D1-D8 draft.

**Architecture:** Use a single FastAPI service with SQLite persistence and a thin service layer for extraction, orchestration, and draft generation. Keep the system schema-first so the frontend receives deterministic JSON for case state and draft rendering.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic, SQLAlchemy or SQLModel, SQLite, pytest, httpx

**Execution notes:**

- Treat commits as optional unless this directory is first initialized as a Git repository.
- Run tests from `backend/` so imports like `from app.main import app` resolve consistently.
- Prefer one packaging path only: keep all backend Python code under `backend/app` and all tests under `backend/tests`.

---

### Task 1: Bootstrap the backend project

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/pytest.ini`
- Create: `backend/app/__init__.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/README.md`
- Create: `backend/tests/test_bootstrap.py`

- [ ] **Step 1: Write the failing test**

```python
from pathlib import Path


def test_backend_bootstrap_files_exist():
    assert Path("pyproject.toml").exists()
    assert Path("pytest.ini").exists()
    assert Path("app/__init__.py").exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_bootstrap.py -v`
Expected: FAIL because the backend package and config files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create:

- `pyproject.toml` with FastAPI, Pydantic, pytest, and httpx dependencies
- `pytest.ini` configured for `tests/`
- package marker files for `app/` and `tests/`
- a short `README.md` with local run and test commands

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_bootstrap.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend
git commit -m "chore: bootstrap backend project files"
```

### Task 2: Create backend skeleton

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/repositories/__init__.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app


def test_healthcheck():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: FAIL because `app.main` or `/health` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `FastAPI()` app with a `/health` route returning `{"status": "ok"}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend/app backend/tests
git commit -m "feat: bootstrap fastapi backend skeleton"
```

### Task 3: Add database models and session management

**Files:**
- Create: `backend/app/db/session.py`
- Create: `backend/app/db/models.py`
- Create: `backend/tests/test_case_models.py`

- [ ] **Step 1: Write the failing test**

```python
from app.db.models import Case, Message, FactSnapshot, Draft


def test_models_define_core_entities():
    assert Case.__tablename__ == "cases"
    assert Message.__tablename__ == "messages"
    assert FactSnapshot.__tablename__ == "fact_snapshots"
    assert Draft.__tablename__ == "drafts"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_case_models.py -v`
Expected: FAIL because models are missing.

- [ ] **Step 3: Write minimal implementation**

Define the four Phase 0 tables with primary keys, `case_id` foreign keys where needed, and created timestamps.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_case_models.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend/app/db backend/tests/test_case_models.py
git commit -m "feat: add phase0 sqlite models"
```

### Task 4: Define request and response schemas

**Files:**
- Create: `backend/app/core/schemas.py`
- Create: `backend/tests/test_schemas.py`

- [ ] **Step 1: Write the failing test**

```python
from app.core.schemas import OrchestrationResult


def test_orchestration_result_supports_phase0_shape():
    result = OrchestrationResult(
        current_stage="fact_completion",
        known_facts=[],
        missing_fields=[],
        assumptions=[],
        risk_flags=[],
        next_question="What batch was affected?",
        should_generate_draft=False,
    )
    assert result.current_stage == "fact_completion"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_schemas.py -v`
Expected: FAIL because schema module does not exist.

- [ ] **Step 3: Write minimal implementation**

Define `FactItem`, `GapItem`, `AssumptionItem`, `OrchestrationResult`, `DraftSection`, and `DraftResult`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_schemas.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend/app/core/schemas.py backend/tests/test_schemas.py
git commit -m "feat: add structured orchestration schemas"
```

### Task 5: Implement case creation and listing APIs

**Files:**
- Create: `backend/app/api/cases.py`
- Create: `backend/app/repositories/cases.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_cases_api.py`

- [ ] **Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app


def test_create_case_returns_case_payload():
    client = TestClient(app)
    response = client.post("/cases", json={"title": "Customer complaint case"})
    assert response.status_code == 200
    assert response.json()["title"] == "Customer complaint case"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_cases_api.py -v`
Expected: FAIL because `/cases` is missing.

- [ ] **Step 3: Write minimal implementation**

Add create/list endpoints and repository helpers for inserting and reading cases.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_cases_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend/app/api/cases.py backend/app/repositories/cases.py backend/app/main.py backend/tests/test_cases_api.py
git commit -m "feat: add case creation and listing endpoints"
```

### Task 6: Implement message intake and persistence

**Files:**
- Create: `backend/app/api/chat.py`
- Create: `backend/app/repositories/messages.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_chat_api.py`

- [ ] **Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app


def test_post_message_persists_user_input():
    client = TestClient(app)
    case = client.post("/cases", json={"title": "Case A"}).json()
    response = client.post(
        f"/cases/{case['id']}/messages",
        json={"content": "Customer reports intermittent failure on batch B12."},
    )
    assert response.status_code == 200
    assert response.json()["case_id"] == case["id"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_chat_api.py -v`
Expected: FAIL because message endpoint is missing.

- [ ] **Step 3: Write minimal implementation**

Persist the user message and return a placeholder orchestration payload.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_chat_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend/app/api/chat.py backend/app/repositories/messages.py backend/app/main.py backend/tests/test_chat_api.py
git commit -m "feat: add message intake endpoint"
```

### Task 7: Add extractor service with structured output validation

**Files:**
- Create: `backend/app/services/extractor.py`
- Create: `backend/tests/test_extractor.py`

- [ ] **Step 1: Write the failing test**

```python
from app.services.extractor import extract_case_state
from app.core.schemas import OrchestrationResult


def test_extractor_returns_known_facts_and_gaps():
    result = extract_case_state("Customer reports failure on batch B12 discovered on March 1.")
    assert isinstance(result, OrchestrationResult)
    assert isinstance(result.known_facts, list)
    assert isinstance(result.missing_fields, list)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_extractor.py -v`
Expected: FAIL because extractor is missing.

- [ ] **Step 3: Write minimal implementation**

Implement a first version that returns validated schema output. Start with deterministic stub logic if needed, then route through the LLM client once contracts are stable.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_extractor.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend/app/services/extractor.py backend/tests/test_extractor.py
git commit -m "feat: add structured fact extraction service"
```

### Task 8: Add orchestration service for one-question flow

**Files:**
- Create: `backend/app/services/orchestrator.py`
- Create: `backend/tests/test_orchestrator.py`

- [ ] **Step 1: Write the failing test**

```python
from app.services.orchestrator import decide_next_step


def test_orchestrator_returns_one_next_question_when_gaps_exist():
    result = decide_next_step(
        known_facts=[],
        missing_fields=[{"field": "batch", "reason": "missing", "priority": "high"}],
    )
    assert result.next_question is not None
    assert result.should_generate_draft is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_orchestrator.py -v`
Expected: FAIL because orchestrator is missing.

- [ ] **Step 3: Write minimal implementation**

Return exactly one high-priority next question when required fields are still missing; otherwise move to draft generation.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_orchestrator.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend/app/services/orchestrator.py backend/tests/test_orchestrator.py
git commit -m "feat: add single-question orchestration flow"
```

### Task 9: Add D1-D8 draft generation

**Files:**
- Create: `backend/app/services/draft_generator.py`
- Create: `backend/app/repositories/drafts.py`
- Create: `backend/tests/test_draft_generator.py`

- [ ] **Step 1: Write the failing test**

```python
from app.services.draft_generator import generate_draft


def test_generate_draft_returns_d1_to_d8_sections():
    draft = generate_draft(known_facts=[], assumptions=[])
    sections = [section.section for section in draft.sections]
    assert sections == ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_draft_generator.py -v`
Expected: FAIL because draft generator is missing.

- [ ] **Step 3: Write minimal implementation**

Generate a deterministic D1-D8 skeleton first, then populate from extracted facts and assumptions.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_draft_generator.py -v`
Expected: PASS

- [ ] **Step 5: Commit if Git is enabled**

```bash
git add backend/app/services/draft_generator.py backend/app/repositories/drafts.py backend/tests/test_draft_generator.py
git commit -m "feat: add phase0 8d draft generation"
```

### Task 10: Wire end-to-end message processing and manual golden-case review

**Files:**
- Modify: `backend/app/api/chat.py`
- Modify: `backend/app/services/extractor.py`
- Modify: `backend/app/services/orchestrator.py`
- Modify: `backend/app/services/draft_generator.py`
- Create: `backend/tests/test_phase0_flow.py`
- Create: `backend/tests/fixtures/golden_cases.json`

- [ ] **Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app


def test_phase0_flow_returns_question_or_draft():
    client = TestClient(app)
    case = client.post("/cases", json={"title": "Case A"}).json()
    response = client.post(
        f"/cases/{case['id']}/messages",
        json={"content": "Customer complaint: intermittent failure, batch unknown, found during incoming test."},
    )
    payload = response.json()
    assert payload["next_question"] or payload["draft"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_phase0_flow.py -v`
Expected: FAIL until extractor, orchestrator, and draft generation are fully connected.

- [ ] **Step 3: Write minimal implementation**

Connect the API route to the full Phase 0 flow, persist fact snapshots and drafts, and add a small golden-case fixture set for regression checking.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_phase0_flow.py -v`
Expected: PASS

- [ ] **Step 5: Run focused verification**

Run: `cd backend && pytest tests -v`
Expected: PASS

- [ ] **Step 6: Commit if Git is enabled**

```bash
git add backend/app backend/tests
git commit -m "feat: complete phase0 end-to-end orchestration flow"
```
