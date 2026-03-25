# Stage Guidance Softening Implementation Plan

> Status: historical plan. The frontend currently already includes stage labels, progress copy, and advance controls; verify current behavior against `docs/current-handoff.md` before using this checklist.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the UI clearly show the current 8D phase and next phase while softening system guidance from required missing-field prompts into suggestion-style language.

**Architecture:** Keep the existing backend state machine intact and add a frontend mapping from internal stages to user-facing 8D phases. Update backend and local fallback suggestion text to describe useful next inputs without forcing a required field.

**Tech Stack:** FastAPI, inline frontend JavaScript, Node test runner, pytest

---

### Task 1: Define expected wording in tests

**Files:**
- Modify: `backend/tests/test_chat_api.py`
- Modify: `deck.test.mjs`

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Run targeted tests to verify failure**
- [ ] **Step 3: Confirm failures are about stage labeling and softer guidance text**

### Task 2: Implement softer backend guidance

**Files:**
- Modify: `backend/app/services/orchestrator.py`
- Test: `backend/tests/test_chat_api.py`

- [ ] **Step 1: Replace hard-question wording with suggestion-style guidance**
- [ ] **Step 2: Keep orchestration stages unchanged**
- [ ] **Step 3: Run targeted backend tests**

### Task 3: Implement frontend 8D phase mapping

**Files:**
- Modify: `index.html`
- Test: `deck.test.mjs`

- [ ] **Step 1: Map internal stages to user-facing current and next 8D phases**
- [ ] **Step 2: Update progress copy to be descriptive, not mandatory**
- [ ] **Step 3: Update local fallback suggestion text to match backend tone**
- [ ] **Step 4: Run frontend tests**

### Task 4: Verify end-to-end behavior

**Files:**
- Modify: `index.html` if needed
- Modify: `backend/app/services/orchestrator.py` if needed

- [ ] **Step 1: Run targeted backend tests**
- [ ] **Step 2: Run frontend tests**
- [ ] **Step 3: Summarize the resulting stage mapping and guidance wording**
